(ns app.worker.router
  (:require
   [integrant.core :as ig]
   [reitit.core :as r]
   [app.user.interface :as user]))

(def base-routes
  ["/api"])

(def routes
    (into base-routes (user/get-routes) #_(concat (excel/routes) (user/routes))))

(def router
  (r/router base-routes))

(defmethod integrant.core/init-key :server/router
  [_ _]
  (r/router router))