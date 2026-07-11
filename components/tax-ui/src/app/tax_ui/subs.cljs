(ns app.tax-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:tax :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:tax :saving?] false)))

(re-frame/reg-sub
 ::tax-configs
 (fn [db _]
   (get-in db [:tax :configs] [])))

(re-frame/reg-sub
 ::loans
 (fn [db _]
   (get-in db [:tax :loans] [])))

(re-frame/reg-sub
 ::maintenances
 (fn [db _]
   (get-in db [:tax :maintenances] [])))

(re-frame/reg-sub
 ::tax-incomes
 (fn [db _]
   (get-in db [:tax :incomes] [])))

(re-frame/reg-sub
 ::tax-expenses
 (fn [db _]
   (get-in db [:tax :expenses] [])))
