(ns app.user.interface
  (:require [integrant.core :as ig]
            [app.user.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)