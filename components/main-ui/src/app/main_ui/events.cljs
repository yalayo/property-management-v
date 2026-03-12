(ns app.main-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.main-ui.db :as db]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.auth-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::change-active-section
 [local-storage-interceptor]
 (fn [db [_ id _]]
   (js/console.log "Id: " id)
   (assoc-in db [:ui :active-section] id)))

(re-frame/reg-event-db
 ::update-sign-in
 [local-storage-interceptor]
 (fn [db [_ id val]]
   (assoc-in db [:user :sign-in :form id] val)))

(re-frame/reg-event-db
 ::update-sign-up
 [local-storage-interceptor]
 (fn [db [_ id val]]
   (assoc-in db [:user :sign-up :form id] val)))

(re-frame/reg-event-fx
 ::get-plans
 (fn [{:keys [db]} [_ base-url]]
   {:http-xhrio {:method          :get
                 :uri             (str base-url "/api/plans")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::get-plans-successfull]
                 :on-failure      [::get-plans-error]}}))

(re-frame/reg-event-db
 ::get-plans-successfull
 [local-storage-interceptor]
 (fn [db [_ response]]
   (-> db
       (assoc-in [:home :plans] response)
       (assoc-in [:home :loading-plans] false))))

(re-frame/reg-event-fx
 ::get-plans-error
 (fn [{:keys [_]} [_ error]]
   (js/console.error "Loading plans failed:" error)
   {}))

(re-frame/reg-event-db
 ::update-sign-up
 [local-storage-interceptor]
 (fn [db [_ id val]]
   (assoc-in db [:user :sign-up :form id] val)))

(re-frame/reg-event-fx
 ::sign-up
 (fn [{:keys [db]} config]
   {:http-xhrio {:method          :post
                 :uri             (str (:api-url config) "/api/sign-up")
                 :params          (get-in db [:user :sign-up :form])
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::signed-up]
                 :on-failure      [::sign-up-error]}}))

(re-frame/reg-event-db
 ::signed-up
 [local-storage-interceptor]
 (fn [db [_ response]]
   (assoc-in db [:user :token] response)))

(re-frame/reg-event-fx
 ::sign-up-error
 (fn [{:keys [_]} [_ error]]
   (js/console.error "Signup failed:" error)
   {}))

(re-frame/reg-event-db
 ::show-sign-up
 [local-storage-interceptor]
 (fn [db [_ _]]
   (assoc-in db [:user :active-form] :sign-up)))

(re-frame/reg-event-fx
 ::sign-out
 (fn [{:keys [db]} _]
   {:http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/sign-out")
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::signed-out]
                 :on-failure      [::signed-out]}
    :db (assoc-in db [:user :sign-out :loading?] true)}))

(re-frame/reg-event-db
 ::signed-out
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:user :info] nil)
       (assoc-in [:user :token] nil)
       (assoc-in [:user :user-loged-in?] false)
       (assoc-in [:user :sign-out :loading?] false)
       (assoc-in [:ui :active-section] "auth"))))

(re-frame/reg-event-fx
 ::navigate-to-apartments
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ property]]
   {:db       (-> db
                  (assoc-in [:ui :active-section] "apartments")
                  (assoc-in [:ui :selected-property] property))
    :dispatch [:app.apartment-ui.events/set-property-filter property]}))