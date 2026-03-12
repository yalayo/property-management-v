(ns app.property-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::properties
 (fn [db _]
   (get-in db [:properties :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:properties :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:properties :saving?] false)))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))
