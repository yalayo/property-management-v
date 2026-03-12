(ns app.auth-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.auth-ui.config :as config]
            [app.auth-ui.db :as db]
            [app.auth-ui.analytics :as analytics]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::sign-in
 (fn [{:keys [db]} [_ form-data]]
   {:db (assoc-in db [:user :sign-in :loading?] true)
    :http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/sign-in")
                 :params          form-data
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::signed-in]
                 :on-failure      [::sign-in-error]}}))

(re-frame/reg-event-fx
 ::signed-in
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ response]]
   (analytics/event "sign_in_successful" {})
   (let [user  (:user response)
         token (:token response)
         db'   (-> db
                   (assoc-in [:user :sign-in :loading?] false)
                   (assoc-in [:user :token] token)
                   (assoc-in [:user :info] user)
                   (assoc-in [:user :user-loged-in?] true)
                   (assoc-in [:ui :active-section] "dashboard"))]
     {:db db'})))

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
