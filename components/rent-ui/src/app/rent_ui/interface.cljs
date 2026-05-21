(ns app.rent-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.rent-ui.events :as events]
            [app.rent-ui.subs]))

(defn load-rent-payments [apartment-id]
  (re-frame/dispatch [::events/load-rent-payments apartment-id]))

(defn create-rent-payment [data]
  (re-frame/dispatch [::events/create-rent-payment data]))

(defn update-rent-payment [data]
  (re-frame/dispatch [::events/update-rent-payment data]))

(defn delete-rent-payment [id]
  (re-frame/dispatch [::events/delete-rent-payment id]))
