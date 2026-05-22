(ns app.core-ui.interface
  (:require 
   [integrant.core :as ig] 
   [app.core-ui.core :as core]))

(defmethod ig/init-key ::component [_ children]
  (core/init children))