(ns app.main-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.main-ui.db :as db]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.auth-ui.config :as config]
            [app.core-ui.events :as core-events]))

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
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db           (dissoc db :user)
    :rules/logout nil}))

(re-frame/reg-event-db
 ::set-dashboard-tab
 [local-storage-interceptor]
 (fn [db [_ tab]]
   (assoc-in db [:ui :dashboard-tab] tab)))

(re-frame/reg-event-fx
 ::navigate-to-apartments
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ property]]
   {:db       (assoc-in db [:ui :selected-property] property)
    :dispatch [:app.apartment-ui.events/set-property-filter property]}))

(re-frame/reg-event-fx
 ::load-admin-users
 (fn [{:keys [db]} _]
   {:db         (assoc-in db [:admin :loading?] true)
    :dispatch   [::core-events/query
                 {:entity :admin-users}
                 [::admin-users-loaded]
                 [::admin-users-error]]}))

(re-frame/reg-event-db
 ::admin-users-loaded
 (fn [db [_ response]]
   (-> db
       (assoc-in [:admin :users] (:users response))
       (assoc-in [:admin :loading?] false))))

(re-frame/reg-event-db
 ::admin-users-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :loading?] false)))

(re-frame/reg-event-db
 ::admin-set-plan-ok
 (fn [db [_ email tier _response]]
   (update-in db [:admin :users]
              (fn [users]
                (mapv (fn [u] (if (= (:email u) email) (assoc u :plan tier) u))
                      (or users []))))))

(re-frame/reg-event-db
 ::admin-set-plan-error
 (fn [db [_ _error]]
   db))

(re-frame/reg-event-fx
 ::admin-set-plan
 (fn [{:keys [_db]} [_ email tier]]
   {:dispatch [::core-events/command
               :admin-set-plan
               {:email email :tier tier}
               [::admin-set-plan-ok email tier]
               [::admin-set-plan-error]]}))

(re-frame/reg-event-fx
 ::load-survey-questions
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:admin :questions-loading?] true)
    :dispatch [::core-events/query
               {:entity :survey-questions}
               [::survey-questions-loaded]
               [::survey-questions-error]]}))

(re-frame/reg-event-db
 ::survey-questions-loaded
 (fn [db [_ response]]
   (-> db
       (assoc-in [:admin :questions] (:questions response))
       (assoc-in [:admin :questions-loading?] false))))

(re-frame/reg-event-db
 ::survey-questions-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :questions-loading?] false)))

(re-frame/reg-event-fx
 ::admin-create-question
 (fn [{:keys [_db]} [_ text order]]
   {:dispatch [::core-events/command
               :admin-create-question
               {:text text :order order}
               [::survey-questions-mutated]
               [::survey-questions-error]]}))

(re-frame/reg-event-fx
 ::admin-update-question
 (fn [{:keys [_db]} [_ id text]]
   {:dispatch [::core-events/command
               :admin-update-question
               {:id id :text text}
               [::survey-questions-mutated]
               [::survey-questions-error]]}))

(re-frame/reg-event-fx
 ::admin-delete-question
 (fn [{:keys [_db]} [_ id]]
   {:dispatch [::core-events/command
               :admin-delete-question
               {:id id}
               [::survey-questions-mutated]
               [::survey-questions-error]]}))

(re-frame/reg-event-fx
 ::survey-questions-mutated
 (fn [{:keys [_db]} _]
   {:dispatch [::load-survey-questions]}))