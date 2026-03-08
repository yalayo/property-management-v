(ns app.register-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.register-ui.config :as config]
            [app.register-ui.db :as db]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]))

(def local-storage-interceptor (after (after db/db->local-store)))

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

(re-frame/reg-event-db
 ::signed-in
 [local-storage-interceptor]
 (fn [db [_ response]]
   (-> db
       (assoc-in [:user :token] response)
       (assoc-in [:user :user-loged-in?] true)
       (assoc-in [:user :sign-in :form] nil))))

(re-frame/reg-event-fx
 ::sign-in-error
 (fn [{:keys [_]} [_ error]]
   (js/console.error "Signin failed:" error)
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
                 :uri             (str (config/get-api-url) "/api/sign-up")
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
   (-> db
       (assoc-in [:user :token] response)
       (assoc-in [:user :user-loged-in?] true)
       (assoc-in [:user :sign-up :form] nil)
       (assoc-in [:ui :active-section] "plans"))))

(re-frame/reg-event-fx
 ::sign-up-error
 (fn [{:keys [_]} [_ error]]
   ;; Work on a better error handling at the UI level
   (js/console.error "Signup failed:" error)
   {}))

(re-frame/reg-event-db
 ::show-sign-in
 [local-storage-interceptor]
 (fn [db [_ _]]
   (assoc-in db [:ui :active-section] "auth")))