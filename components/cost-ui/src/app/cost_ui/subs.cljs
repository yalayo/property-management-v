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
 ::apt-cost-save-error?
 (fn [db _]
   (get-in db [:apartment-costs :save-error?] false)))

(re-frame/reg-sub
 ::all-costs
 (fn [db _]
   (get-in db [:all-costs :list] [])))

(re-frame/reg-sub
 ::all-apt-costs
 (fn [db _]
   (get-in db [:all-apt-costs :list] [])))

(re-frame/reg-sub
 ::all-rent-payments
 (fn [db _]
   (get-in db [:all-rent-payments :list] [])))

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

(re-frame/reg-sub
 ::expense-types-save-error?
 (fn [db _]
   (get-in db [:expense-types :save-error] false)))

(re-frame/reg-sub
 ::bank-accounts
 (fn [db _]
   (get-in db [:bank-accounts :list] [])))

(re-frame/reg-sub
 ::bank-accounts-loading?
 (fn [db _]
   (get-in db [:bank-accounts :loading?] false)))

(re-frame/reg-sub
 ::bank-accounts-saving?
 (fn [db _]
   (get-in db [:bank-accounts :saving?] false)))

(re-frame/reg-sub
 ::nebenkosten-settlements
 (fn [db _]
   (get-in db [:nk-settlements :list] [])))

(re-frame/reg-sub
 ::nk-settlements-saving?
 (fn [db _]
   (get-in db [:nk-settlements :saving?] false)))
