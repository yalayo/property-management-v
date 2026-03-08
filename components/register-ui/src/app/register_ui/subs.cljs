(ns app.register-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::active-form
 (fn [db [_ _]]
   (get-in db [:user :active-form] :sign-up)))

(re-frame/reg-sub
 ::sign-in-form
 (fn [db [_ id]]
   (get-in db [:user :sign-in :form id] "")))

(re-frame/reg-sub
 ::sign-up-form
 (fn [db [_ id]]
   (get-in db [:user :sign-up :form id] "")))