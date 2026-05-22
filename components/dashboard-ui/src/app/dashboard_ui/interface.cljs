(ns app.dashboard-ui.interface
  (:require [integrant.core :as ig]
             [app.landing-ui.views :as views]))
  
  (defmethod ig/init-key ::component [_ _]
    views/component)
