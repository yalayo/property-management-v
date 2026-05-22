(ns app.register-ui.interface
  (:require [integrant.core :as ig]
            [app.register-ui.views :as views]))

(defmethod ig/init-key ::component [_ _]
  views/component)
