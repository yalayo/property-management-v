(ns app.apartment.interface
  (:require [integrant.core :as ig]
            [app.apartment.routes :as routes]))

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
