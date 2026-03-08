(ns app.main-ui.interface
  (:require [integrant.core :as ig]
            [app.main-ui.views :as views]))

(defn component []
  (views/component))

(defmethod ig/init-key ::component [_ {:keys [local-storage]}]
  views/component)
