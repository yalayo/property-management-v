(ns app.controller.interface
  (:require [integrant.core :as ig]
            [app.controller.core :as core]))

(defmethod ig/init-key ::controller [_ {:keys [core storage]}]
  (fn [ctx]
    (core/dispatch (assoc ctx :core core :storage storage))))
