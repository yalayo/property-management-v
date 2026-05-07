(ns app.user.interface
  (:require [integrant.core :as ig]
            [app.user.routes :as routes]))

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
