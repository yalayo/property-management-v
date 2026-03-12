(ns app.property-ui.interface
  (:require [app.property-ui.views :as views]))

(defn component [props]
  [views/component props])
