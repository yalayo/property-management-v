(ns app.auth-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.auth-ui.db :as db]
            [app.auth-ui.analytics :as analytics]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::sign-in
 (fn [{:keys [db]} [_ form-data]]
   {:db       (assoc-in db [:user :sign-in :loading?] true)
    :dispatch [:app.core-ui.events/command
               :user-sign-in
               form-data
               [::signed-in]
               [::sign-in-error]]}))

(re-frame/reg-event-fx
 ::signed-in
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ {:keys [token user]}]]
   (analytics/event "sign_in_successful" {})
   {:db               (-> db
                          (assoc-in [:user :sign-in :loading?] false)
                          (assoc-in [:user :token] token)
                          (assoc-in [:user :info] user)
                          (assoc-in [:user :logged-in?] true))
    :rules/on-success {:form-id :auth :response {:token token :user user}}}))

(re-frame/reg-event-fx
 ::sign-in-error
 (fn [{:keys [db]} [_ error]]
   (js/console.error "Signin failed:" error)
   {:db (assoc-in db [:user :sign-in :loading?] false)}))

(re-frame/reg-event-fx
 ::show-sign-up
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   (analytics/event "sign_up_attempt" {})
   {:db (assoc-in db [:ui :active-section] "register")}))

(re-frame/reg-event-db
 ::go-home
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:ui :active-section] "home")))
