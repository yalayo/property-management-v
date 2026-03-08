(ns app.register-ui.interface
  (:require [integrant.core :as ig]
            [app.register-ui.views :as views]))

(defn component [id]
  (views/component id))

(defmethod ig/init-key ::component [_ {:keys [local-storage]}]
  views/component)
