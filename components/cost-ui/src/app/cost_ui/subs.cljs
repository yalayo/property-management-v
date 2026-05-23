(ns app.cost-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::costs
 (fn [db _]
   (get-in db [:costs :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:costs :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:costs :saving?] false)))

(re-frame/reg-sub
 ::apartment-costs
 (fn [db _]
   (get-in db [:apartment-costs :list] [])))

(re-frame/reg-sub
 ::apt-costs-loading?
 (fn [db _]
   (get-in db [:apartment-costs :loading?] false)))

(re-frame/reg-sub
 ::apt-costs-saving?
 (fn [db _]
   (get-in db [:apartment-costs :saving?] false)))

(re-frame/reg-sub
 ::expense-types
 (fn [db _]
   (get-in db [:expense-types :list] [])))

(re-frame/reg-sub
 ::expense-types-loading?
 (fn [db _]
   (get-in db [:expense-types :loading?] false)))

(re-frame/reg-sub
 ::expense-types-saving?
 (fn [db _]
   (get-in db [:expense-types :saving?] false)))
