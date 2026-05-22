(ns app.register-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.register-ui.db :as db]
            [app.register-ui.analytics :as analytics]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::sign-up
 (fn [{:keys [db]} [_ form-data]]
   {:db       (assoc-in db [:user :sign-up :loading?] true)
    :dispatch [:app.core-ui.events/command
               :user-sign-up
               form-data
               [::signed-up]
               [::sign-up-error]]}))

(re-frame/reg-event-fx
 ::signed-up
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ _response]]
   (analytics/event "sign_up_successful" {})
   {:db (-> db
            (assoc-in [:user :sign-up :loading?] false)
            (assoc-in [:user :sign-up :form] nil)
            (assoc-in [:ui :active-section] "auth"))}))

(re-frame/reg-event-fx
 ::sign-up-error
 (fn [{:keys [db]} [_ error]]
   (js/console.error "Signup failed:" error)
   {:db (assoc-in db [:user :sign-up :loading?] false)}))

(re-frame/reg-event-fx
 ::show-sign-in
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   (analytics/event "sign_in_attempt" {})
   {:db (assoc-in db [:ui :active-section] "auth")}))

(re-frame/reg-event-db
 ::go-home
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:ui :active-section] "home")))
