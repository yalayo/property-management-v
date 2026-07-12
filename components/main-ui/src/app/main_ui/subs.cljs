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
   (let [plan  (get-in db [:user :info :plan])
         trial (get-in db [:user :info :trial])]
     (or (some? plan)
         (and (some? trial) (= "active" (:status trial)))))))

(re-frame/reg-sub
 ::trial-info
 (fn [db _]
   (get-in db [:user :info :trial])))

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

(re-frame/reg-sub
 ::is-impersonating?
 (fn [db _]
   (true? (get-in db [:impersonation :active?]))))

(re-frame/reg-sub
 ::impersonated-user-email
 (fn [db _]
   (get-in db [:user :info :email])))

(re-frame/reg-sub
 ::admin-exporting?
 (fn [db _]
   (get-in db [:admin :exporting?] false)))

(re-frame/reg-sub
 ::admin-importing?
 (fn [db _]
   (get-in db [:admin :importing?] false)))

(re-frame/reg-sub
 ::user-role
 (fn [db _]
   (get-in db [:user :info :role])))

(re-frame/reg-sub
 ::user-sections
 (fn [db _]
   (get-in db [:user :info :sections])))

(re-frame/reg-sub
 ::org-features
 (fn [db _]
   (get-in db [:features :enabled])))

(re-frame/reg-sub
 ::admin-features
 (fn [db _]
   (get-in db [:admin :features] [])))

(re-frame/reg-sub
 ::admin-features-loading?
 (fn [db _]
   (get-in db [:admin :features-loading?] false)))

(re-frame/reg-sub
 ::admin-org-features
 (fn [db _]
   (get-in db [:admin :org-features] [])))

(re-frame/reg-sub
 ::admin-org-features-loading?
 (fn [db _]
   (get-in db [:admin :org-features-loading?] false)))

(re-frame/reg-sub
 ::admin-org-features-email
 (fn [db _]
   (get-in db [:admin :org-features-email])))

(re-frame/reg-sub
 ::org-users
 (fn [db _]
   (get-in db [:team :users] [])))

(re-frame/reg-sub
 ::org-users-loading?
 (fn [db _]
   (get-in db [:team :loading?] false)))

(re-frame/reg-sub
 ::org-users-saving?
 (fn [db _]
   (get-in db [:team :saving?] false)))