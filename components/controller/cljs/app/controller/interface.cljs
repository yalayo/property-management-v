(ns app.controller.interface
  (:require [integrant.core :as ig]))

(defmethod ig/init-key ::controller [_ [{:keys [core]}]]
  )