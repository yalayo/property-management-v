(ns app.tenant.interface
  (:require [integrant.core :as ig]
            [app.tenant.routes :as routes]))

(defmethod ig/init-key ::routes [_ _]
  routes/routes)
