(ns app.rent-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::rent-payments
 (fn [db _]
   (get-in db [:rent-payments :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:rent-payments :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:rent-payments :saving?] false)))

(re-frame/reg-sub
 ::garage-payments
 (fn [db _]
   (get-in db [:garage-payments :list] [])))

(re-frame/reg-sub
 ::garage-payments-saving?
 (fn [db _]
   (get-in db [:garage-payments :saving?] false)))

(re-frame/reg-sub
 ::tenant-mieten
 (fn [db _]
   (get-in db [:tenant-mieten :list] [])))

(re-frame/reg-sub
 ::miete-saving?
 (fn [db _]
   (get-in db [:tenant-mieten :saving?] false)))
