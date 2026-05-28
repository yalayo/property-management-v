(ns app.tax-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.tax-ui.events :as events]
            [app.tax-ui.subs]))

(defn load-tax-data []
  (re-frame/dispatch [::events/load-tax-data]))

(defn save-tax-config [data]
  (re-frame/dispatch [::events/save-tax-config data]))

(defn create-loan [data]
  (re-frame/dispatch [::events/create-loan data]))

(defn update-loan [data]
  (re-frame/dispatch [::events/update-loan data]))

(defn delete-loan [id]
  (re-frame/dispatch [::events/delete-loan id]))
