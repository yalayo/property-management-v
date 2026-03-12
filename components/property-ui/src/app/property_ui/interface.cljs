(ns app.property-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.property-ui.views :as views]
            [app.property-ui.events :as events]
            [app.property-ui.subs]))

(defn component [props]
  [views/component props])

(defn load-properties []
  (re-frame/dispatch [::events/load-properties]))
