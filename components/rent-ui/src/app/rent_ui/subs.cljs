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
