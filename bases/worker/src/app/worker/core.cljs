(ns app.worker.core
  (:require [integrant.core :as ig]
            [reitit.core :as r]
            [app.worker.async :refer [js-await]]
            [app.worker.auth :as auth]
            [app.worker.cf :as cf]
            [app.worker.routes :as routes]))

(def allowed-origins
  #{"http://localhost:8081"
    "https://miete.busqandote.com"})

(defn cors-headers-for [origin]
  (if (allowed-origins origin)
    {"Access-Control-Allow-Origin" origin
     "Vary" "Origin"
     "Access-Control-Allow-Methods" "GET, POST, PUT, PATCH, DELETE, OPTIONS"
     "Access-Control-Allow-Headers" "Content-Type, Authorization"
     "Access-Control-Max-Age" "86400"}
    ;; origin not allowed
    {"Access-Control-Allow-Origin" "null"
     "Vary" "Origin"}))

(defn ensure-js-response [resp]
  (if (instance? js/Response resp)
    resp
    (let [{:keys [status headers body]} resp
          js-headers (if (map? headers)
                       (clj->js headers)
                       #js {})]
      (js/Response. (or body "") #js {:status (or status 200)
                                      :headers js-headers}))))

(defn add-cors-response [resp origin]
  (let [response (ensure-js-response resp)
        hdrs (.-headers response)]
    (doseq [[k v] (cors-headers-for origin)]
      (.set hdrs k v))
    response))

(defn extract-bearer-token [request]
  (when-let [auth (.get (.-headers request) "Authorization")]
    (let [[scheme token] (.split auth " ")]
      (when (= scheme "Bearer")
        token))))

(defn authenticate [request env]
  (js-await
   [token (extract-bearer-token request)]
   (when token
     (auth/verify-jwt token (aget env "JWT_SECRET")))))

(def base-routes
  ["/api"])

(defn handle-route [route request env ctx]
  (let [origin (.get (.-headers request) "Origin")
        method (.-method request)]
    (if (= method "OPTIONS") ;; Preflight
      (add-cors-response (cf/response nil {:status 204}) origin)
      (let [method-k        (keyword (.toLowerCase method))
            route-data      (:data route)
            handler         (get-in route-data [method-k :handler])
            requires-auth?  (get-in route-data [method-k :auth-required])
            requires-admin? (get-in route-data [method-k :admin-required])]
        (if (some? handler)
          (js-await
           [user (when requires-auth?
                   (authenticate request env))]
           (cond
             (and requires-auth? (nil? user))
             (add-cors-response (cf/response-error {:error "Unauthorized"} {:status 401}) origin)

             (and requires-admin? (not= "admin" (aget user "role")))
             (add-cors-response (cf/response-error {:error "Forbidden"} {:status 403}) origin)

             :else
             (-> (js/Promise.resolve (handler {:route route :request request :env env :execution-ctx ctx :user user}))
                 (.then (fn [resp] (add-cors-response resp origin)))
                 (.catch (fn [err]
                           (js/console.error "Handler error:" err)
                           (let [status (if (= "schema-missing" (aget err "code")) 503 500)]
                             (add-cors-response (cf/response-error {:error (.-message err)} {:status status}) origin)))))))
          (add-cors-response (cf/response-error {:error "Not found"} {:status 404}) origin))))))


(defn init [{:keys [core storage]}]
  (let [routes (into base-routes (concat (routes/create-routes core storage)))
        router (r/router routes {:conflicts nil})
        handler #js {:fetch (cf/with-handler router handle-route)}]
    handler))

(defmethod integrant.core/init-key ::handler
  [_ dependencies]
  (init dependencies))