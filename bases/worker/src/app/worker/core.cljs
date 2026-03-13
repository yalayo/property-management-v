(ns app.worker.core
  (:require [integrant.core :as ig]
            ["cloudflare:workers" :refer [DurableObject]]
            [reitit.core :as r]
            [app.worker.async :refer [js-await]]
            [app.worker.durable-objects :as do]
            [app.worker.auth :as auth]
            [app.worker.cf :as cf :refer [defclass]]))

;; usage example of Durable Objects as a short-lived state
;; for user presence tracking in multiplayer web app
(defclass ^{:extends DurableObject} PresenceDurableObject [ctx env]
  Object
  (constructor [this ctx env]
               (super ctx env))

  (add-user-presence+ [this id timestamp]
                      (js-await [_ (do/storage-put+ ctx id timestamp)
                                 users (do/storage-list+ ctx)
                                 now (js/Date.now)]
                                (doseq [[id _] (->> (cf/js->clj users)
                                                    (filter (fn [[id ts]] (> (- now ts) 10000))))]
                                  (do/storage-delete+ ctx id))
                                (do/storage-list+ ctx))))

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
      (let [method-k (keyword (.toLowerCase method))
            route-data (:data route)
            handler   (get-in route-data [method-k :handler])
            requires-auth? (get-in route-data [method-k :auth-required])]
        (if (some? handler)
          (js-await
           [user (when requires-auth?
                   (authenticate request env))]
           (if (and requires-auth? (nil? user))
             (add-cors-response (cf/response-error {:error "Unauthorized"} {:status 401}) origin)
             (js-await
              [resp (handler {:route route :request request :env env :execution-ctx ctx :user user})]
              (add-cors-response resp origin))))
          (add-cors-response (cf/response-error {:error "Not implemented"}) origin))))))


(defn init [{:keys [user-routes survey-routes plans-routes property-routes apartment-routes settings-routes price-routes request-routes]}]
  (let [routes (into base-routes (concat user-routes survey-routes plans-routes property-routes apartment-routes settings-routes price-routes request-routes))
        router (r/router routes)
        handler #js {:fetch (cf/with-handler router handle-route)}]
    handler))

(defmethod integrant.core/init-key ::handler
  [_ dependencies]
  (init dependencies))