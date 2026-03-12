(ns app.dashboard-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.dashboard-ui.views :as views]
            [app.dashboard-ui.events :as events]
            [app.dashboard-ui.subs]))

(defn component [props]
  [views/component props])

(defn load-occupancy []
  (re-frame/dispatch [::events/load-occupancy]))
