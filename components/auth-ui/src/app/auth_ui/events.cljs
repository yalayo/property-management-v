(ns app.auth-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.auth-ui.config :as config]
            [app.auth-ui.db :as db]
            [app.dashboard-ui.events :as dashboard]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::update-sign-in
 [local-storage-interceptor]
 (fn [db [_ id val]]
   (assoc-in db [:user :sign-in :form id] val)))

(re-frame/reg-event-fx
 ::sign-in
 (fn [{:keys [db]} _]
   {:http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/sign-in")
                 :params          (get-in db [:user :sign-in :form])
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::signed-in]
                 :on-failure      [::sign-in-error]}}))

(re-frame/reg-event-fx
 ::signed-in
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ response]]
   (let [user (:user response)
         token (:token response)
         active-section "dashboard"
         db' (-> db
                 (assoc-in [:user :token] token)
                 (assoc-in [:user :info] user)
                 (assoc-in [:user :user-loged-in?] true)
                 (assoc-in [:user :sign-in :form] nil)
                 (assoc-in [:ui :active-section] active-section))]
     {:db db'
      :dispatch-n [[::dashboard/get-current-subscription]
                   [::dashboard/get-payment-info]]})))

(re-frame/reg-event-fx
 ::sign-in-error
 (fn [{:keys [_]} [_ error]]
   (js/console.error "Signin failed:" error)
   {}))

(re-frame/reg-event-db
 ::show-sign-up
 [local-storage-interceptor]
 (fn [db [_ _]]
   (assoc-in db [:ui :active-section] "register")))