(ns app.worker.handler
  (:require
   [integrant.core :as ig]
   [reitit.ring :as ring]
   [reitit.core :as r]
   [app.worker.cf :as cf]))

(def DB (atom nil))
(def ENV (atom nil))
(def CTX (atom nil))

(defn- with-params [^js/URL url route]
  (assoc route :query-params
         (->> (.entries (.-searchParams url))
              (reduce (fn [ret [k v]]
                        (assoc ret (keyword k) v))
                      {}))))

(defmethod ig/init-key :server/handler
  [_ {:keys [router]}]
  ;; Build a Ring handler from the router
  (let [ring-handler (ring/ring-handler router)]
    ;; Wrap it for Cloudflare fetch API
    (fn [^js request env ctx]
      (reset! ENV env)
      (reset! CTX ctx)
      (reset! DB (aget env "DB"))
      (cf/ring->fetch ring-handler request env ctx))))