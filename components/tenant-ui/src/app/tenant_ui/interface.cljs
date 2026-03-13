(ns app.tenant-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.tenant-ui.views :as views]
            [app.tenant-ui.events :as events]
            [app.tenant-ui.subs]))

(defn component [props]
  [views/component props])

(defn load-tenants []
  (re-frame/dispatch [::events/load-tenants]))
