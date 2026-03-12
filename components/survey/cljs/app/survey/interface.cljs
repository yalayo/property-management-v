(ns app.survey.interface
  (:require [integrant.core :as ig]
            [app.survey.routes :as routes]))

(defn get-routes []
  routes/routes)

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
