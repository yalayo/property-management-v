(ns app.payment.interface
  (:require [integrant.core :as ig]
            [app.payment.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
