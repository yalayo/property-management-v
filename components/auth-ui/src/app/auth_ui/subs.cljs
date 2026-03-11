(ns app.auth-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))

(re-frame/reg-sub
 ::sign-in-loading
 (fn [db _]
   (get-in db [:user :sign-in :loading?] false)))
