(ns app.register-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.register-ui.config :as config]
            [app.register-ui.db :as db]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::sign-up
 (fn [{:keys [db]} [_ form-data]]
   {:db (assoc-in db [:user :sign-up :loading?] true)
    :http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/sign-up")
                 :params          form-data
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
       (assoc-in [:user :sign-up :loading?] false)
       (assoc-in [:user :token] (:token response))
       (assoc-in [:user :info] (:user response))
       (assoc-in [:user :user-loged-in?] true)
       (assoc-in [:user :sign-up :form] nil)
       (assoc-in [:ui :active-section] "plans"))))

(re-frame/reg-event-fx
 ::sign-up-error
 (fn [{:keys [db]} [_ error]]
   (js/console.error "Signup failed:" error)
   {:db (assoc-in db [:user :sign-up :loading?] false)}))

(re-frame/reg-event-db
 ::show-sign-in
 [local-storage-interceptor]
 (fn [db [_ _]]
   (assoc-in db [:ui :active-section] "auth")))
