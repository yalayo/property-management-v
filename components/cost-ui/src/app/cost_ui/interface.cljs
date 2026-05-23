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

(defn load-apartment-costs [apartment-id]
  (re-frame/dispatch [::events/load-apartment-costs apartment-id]))

(defn create-apartment-cost [data]
  (re-frame/dispatch [::events/create-apartment-cost data]))

(defn update-apartment-cost [data]
  (re-frame/dispatch [::events/update-apartment-cost data]))

(defn delete-apartment-cost [id]
  (re-frame/dispatch [::events/delete-apartment-cost id]))

(defn load-expense-types []
  (re-frame/dispatch [::events/load-expense-types]))

(defn create-expense-type [data]
  (re-frame/dispatch [::events/create-expense-type data]))

(defn update-expense-type [data]
  (re-frame/dispatch [::events/update-expense-type data]))

(defn delete-expense-type [id]
  (re-frame/dispatch [::events/delete-expense-type id]))
