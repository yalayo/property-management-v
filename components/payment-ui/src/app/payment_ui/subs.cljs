(ns app.payment-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::step
 (fn [db _] (get-in db [:payment :step])))

(re-frame/reg-sub
 ::tier-id
 (fn [db _] (get-in db [:payment :tier-id])))

(re-frame/reg-sub
 ::client-secret
 (fn [db _] (get-in db [:payment :client-secret])))

(re-frame/reg-sub
 ::intent-type
 (fn [db _] (get-in db [:payment :intent-type] :payment)))

(re-frame/reg-sub
 ::loading?
 (fn [db _] (get-in db [:payment :loading?] false)))

(re-frame/reg-sub
 ::error
 (fn [db _] (get-in db [:payment :error])))

(re-frame/reg-sub
 ::intent-id
 (fn [db _] (get-in db [:payment :intent-id])))
