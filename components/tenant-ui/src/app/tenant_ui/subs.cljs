(ns app.tenant-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::tenants
 (fn [db _]
   (get-in db [:tenants :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:tenants :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:tenants :saving?] false)))

(re-frame/reg-sub
 ::add-dialog-open?
 (fn [db _]
   (get-in db [:tenants :add-dialog-open?] false)))

(re-frame/reg-sub
 ::selected-tenant-id
 (fn [db _]
   (get-in db [:tenants :selected-id])))
