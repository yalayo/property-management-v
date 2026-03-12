(ns app.apartment-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.apartment-ui.views :as views]
            [app.apartment-ui.events :as events]
            [app.apartment-ui.subs]))

(defn component [props]
  [views/component props])

(defn load-apartments []
  (re-frame/dispatch [::events/load-apartments]))
