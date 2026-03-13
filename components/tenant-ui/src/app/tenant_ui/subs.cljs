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

(re-frame/reg-sub
 ::new-name
 (fn [db _]
   (get-in db [:tenants :new-name] "")))

(re-frame/reg-sub
 ::new-email
 (fn [db _]
   (get-in db [:tenants :new-email] "")))

(re-frame/reg-sub
 ::new-phone
 (fn [db _]
   (get-in db [:tenants :new-phone] "")))

(re-frame/reg-sub
 ::new-start-date
 (fn [db _]
   (get-in db [:tenants :new-start-date] "")))

(re-frame/reg-sub
 ::new-apartment-id
 (fn [db _]
   (get-in db [:tenants :new-apartment-id])))
