(ns app.tenant.interface
  (:require [integrant.core :as ig]
            [app.tenant.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
