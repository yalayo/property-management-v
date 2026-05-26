(ns app.main-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::active-section
 (fn [db]
   (get-in db [:ui :active-section] "home")))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))

(re-frame/reg-sub
 ::survey-email
 (fn [db _]
   (get-in db [:survey :email] "")))

(re-frame/reg-sub
 ::selected-property
 (fn [db _]
   (get-in db [:ui :selected-property])))

(re-frame/reg-sub
 ::dashboard-tab
 (fn [db _]
   (get-in db [:ui :dashboard-tab] "overview")))

(re-frame/reg-sub
 ::has-active-plan?
 (fn [db _]
   (some? (get-in db [:user :info :plan]))))

(re-frame/reg-sub
 ::is-super-admin?
 (fn [db _]
   (true? (get-in db [:user :info :superadmin]))))

(re-frame/reg-sub
 ::admin-users
 (fn [db _]
   (get-in db [:admin :users] [])))

(re-frame/reg-sub
 ::admin-loading?
 (fn [db _]
   (get-in db [:admin :loading?] false)))

(re-frame/reg-sub
 ::survey-questions
 (fn [db _]
   (get-in db [:admin :questions] [])))

(re-frame/reg-sub
 ::survey-questions-loading?
 (fn [db _]
   (get-in db [:admin :questions-loading?] false)))