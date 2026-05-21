(ns app.cost-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.cost-ui.events :as events]
            [app.cost-ui.subs]))

(defn load-costs [property-id]
  (re-frame/dispatch [::events/load-costs property-id]))

(defn create-cost [data]
  (re-frame/dispatch [::events/create-cost data]))

(defn update-cost [data]
  (re-frame/dispatch [::events/update-cost data]))

(defn delete-cost [id]
  (re-frame/dispatch [::events/delete-cost id]))
