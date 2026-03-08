(ns app.auth-ui.interface
  (:require [integrant.core :as ig]
            [app.auth-ui.views :as views]))

(defmethod ig/init-key ::component [_ {:keys [local-storage]}]
  views/component)
