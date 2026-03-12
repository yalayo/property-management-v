(ns app.dashboard.interface
  (:require [integrant.core :as ig]
            [app.dashboard.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
