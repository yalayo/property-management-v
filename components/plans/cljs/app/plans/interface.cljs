(ns app.plans.interface
  (:require [integrant.core :as ig]
            [app.plans.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
