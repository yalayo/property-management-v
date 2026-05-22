(ns app.main-ui.interface
  (:require [integrant.core :as ig]
            [app.main-ui.views :as views]))
  
  (defmethod ig/init-key ::component [_ _]
    views/component)
