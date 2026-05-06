(ns app.user.interface
  (:require [integrant.core :as ig]
            [app.user.routes :as routes]))

(defmethod ig/init-key ::routes [_ {:keys [storage]}]
  (routes/make-routes storage))
