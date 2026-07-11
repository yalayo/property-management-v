(ns app.accounting-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::journal-entries
 (fn [db _]
   (get-in db [:accounting :journal-entries] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:accounting :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:accounting :saving?] false)))

(re-frame/reg-sub
 ::onboarding
 (fn [db _]
   (get-in db [:accounting :onboarding])))

(re-frame/reg-sub
 ::opening-balances
 (fn [db _]
   (get-in db [:accounting :opening-balances] [])))

(re-frame/reg-sub
 ::onboarding-loaded?
 (fn [db _]
   (get-in db [:accounting :onboarding-loaded?] false)))
