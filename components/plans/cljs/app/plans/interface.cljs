(ns app.plans.interface
  (:require [integrant.core :as ig]
            [app.plans.routes :as routes]))

(defmethod ig/init-key ::routes [_ {:keys [storage]}]
  (routes/make-routes storage))
