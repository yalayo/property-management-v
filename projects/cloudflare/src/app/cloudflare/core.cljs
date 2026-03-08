(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.price.interface :as price]
            [app.request.interface :as request]
            [app.user.interface :as user]
            [app.settings.interface :as settings]))

(def config
  {::user/routes {}
   ::price/routes {}
   ::request/routes {}
   ::settings/routes {}
   ::worker/handler {:user-routes (ig/ref ::user/routes) 
                     :settings-routes (ig/ref ::settings/routes)
                     :price-routes (ig/ref ::price/routes)
                     :request-routes (ig/ref ::request/routes)}})

(defonce system (atom nil))

(defn start []
  (reset! system (ig/init config)))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

(defn restart []
  (stop)
  (start))

(defn init []
  (start)
  (::worker/handler @system))

(def handler (init))