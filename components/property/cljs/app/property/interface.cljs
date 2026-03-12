(ns app.property.interface
  (:require [integrant.core :as ig]
            [app.property.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
