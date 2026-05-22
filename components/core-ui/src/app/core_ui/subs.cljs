(ns app.core-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub ::logged-in?
  (fn [db _] (get-in db [:user :logged-in?] false)))

(re-frame/reg-sub ::user-info
  (fn [db _] (get-in db [:user :info])))

(re-frame/reg-sub ::user-role
  (fn [db _] (get-in db [:user :info :role] "client")))

(re-frame/reg-sub ::token
  (fn [db _] (get-in db [:user :token])))

(re-frame/reg-sub ::auth-mode
  (fn [db _] (get-in db [:ui :auth-mode] "login")))

(re-frame/reg-sub ::form-field
  (fn [db [_ field]]
    (get-in db [:auth :form field] "")))

(re-frame/reg-sub ::auth-error
  (fn [db _] (get-in db [:auth :error])))

;; ── Service requests ──────────────────────────────────────────────────────────

(re-frame/reg-sub ::service-requests
  (fn [db _] (get-in db [:admin :service-requests] [])))

(re-frame/reg-sub ::service-requests-loading?
  (fn [db _] (get-in db [:admin :loading?] false)))

(re-frame/reg-sub ::admin-error
  (fn [db _] (get-in db [:admin :error])))

;; ── Admin tab state ───────────────────────────────────────────────────────────

(re-frame/reg-sub ::admin-users-tab?
  (fn [db _] (get-in db [:admin :users-tab?] false)))

;; ── User management ───────────────────────────────────────────────────────────

(re-frame/reg-sub ::users
  (fn [db _] (get-in db [:admin :users] [])))

(re-frame/reg-sub ::users-loading?
  (fn [db _] (get-in db [:admin :users-loading?] false)))

(re-frame/reg-sub ::users-error
  (fn [db _] (get-in db [:admin :users-error])))

(re-frame/reg-sub ::user-create-loading?
  (fn [db _] (get-in db [:admin :user-create-loading?] false)))

(re-frame/reg-sub ::user-create-error
  (fn [db _] (get-in db [:admin :user-create-error])))

(re-frame/reg-sub ::user-create-success?
  (fn [db _] (get-in db [:admin :user-create-success?] false)))
