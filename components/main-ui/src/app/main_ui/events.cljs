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

;; ---------------------------------------------------------------------------
;; Feature flags
;; ---------------------------------------------------------------------------

;; Current org's effective-enabled feature keys — used to gate the app.
(re-frame/reg-event-fx
 ::load-org-features
 (fn [{:keys [_db]} _]
   {:dispatch [::core-events/query
               {:entity :org-features}
               [::org-features-loaded]
               [::org-features-error]]}))

(re-frame/reg-event-db
 ::org-features-loaded
 [local-storage-interceptor]
 (fn [db [_ response]]
   (assoc-in db [:features :enabled] (:features response))))

(re-frame/reg-event-db
 ::org-features-error
 (fn [db [_ _error]]
   db))

;; Super-admin: global feature catalog
(re-frame/reg-event-fx
 ::load-admin-features
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:admin :features-loading?] true)
    :dispatch [::core-events/query
               {:entity :admin-features}
               [::admin-features-loaded]
               [::admin-features-error]]}))

(re-frame/reg-event-db
 ::admin-features-loaded
 (fn [db [_ response]]
   (-> db
       (assoc-in [:admin :features] (:features response))
       (assoc-in [:admin :features-loading?] false))))

(re-frame/reg-event-db
 ::admin-features-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :features-loading?] false)))

(re-frame/reg-event-fx
 ::admin-features-mutated
 (fn [{:keys [_db]} _]
   {:dispatch [::load-admin-features]}))

(re-frame/reg-event-fx
 ::admin-create-feature
 (fn [{:keys [_db]} [_ data]]
   {:dispatch [::core-events/command
               :admin-create-feature
               data
               [::admin-features-mutated]
               [::admin-features-error]]}))

(re-frame/reg-event-fx
 ::admin-update-feature
 (fn [{:keys [_db]} [_ id data]]
   {:dispatch [::core-events/command
               :admin-update-feature
               (assoc data :id id)
               [::admin-features-mutated]
               [::admin-features-error]]}))

(re-frame/reg-event-fx
 ::admin-delete-feature
 (fn [{:keys [_db]} [_ id]]
   {:dispatch [::core-events/command
               :admin-delete-feature
               {:id id}
               [::admin-features-mutated]
               [::admin-features-error]]}))

;; Super-admin: per-organization overrides for one user's org
(re-frame/reg-event-fx
 ::load-org-feature-overrides
 (fn [{:keys [db]} [_ email]]
   {:db       (-> db
                  (assoc-in [:admin :org-features-loading?] true)
                  (assoc-in [:admin :org-features-email] email))
    :dispatch [::core-events/query
               {:entity :admin-org-features :email email}
               [::org-feature-overrides-loaded]
               [::org-feature-overrides-error]]}))

(re-frame/reg-event-db
 ::org-feature-overrides-loaded
 (fn [db [_ response]]
   (-> db
       (assoc-in [:admin :org-features] (:features response))
       (assoc-in [:admin :org-features-loading?] false))))

(re-frame/reg-event-db
 ::org-feature-overrides-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :org-features-loading?] false)))

(re-frame/reg-event-fx
 ::admin-set-org-feature
 (fn [{:keys [_db]} [_ email feature-key enabled]]
   {:dispatch [::core-events/command
               :admin-set-org-feature
               {:email email :feature-key feature-key :enabled enabled}
               [::load-org-feature-overrides email]
               [::org-feature-overrides-error]]}))

;; ---------------------------------------------------------------------------
;; Impersonation
;; ---------------------------------------------------------------------------

(re-frame/reg-event-fx
 ::admin-impersonate-user
 (fn [{:keys [db]} [_ email]]
   {:dispatch [::core-events/command
               :admin-impersonate
               {:email email}
               [::impersonation-ok]
               [::impersonation-error]]}))

(re-frame/reg-event-db
 ::impersonation-ok
 [local-storage-interceptor]
 (fn [db [_ response]]
   (let [original-token (get-in db [:user :token])
         original-info  (get-in db [:user :info])]
     {:impersonation   {:active?     true
                        :admin-token original-token
                        :admin-info  original-info}
      :current-section :dashboard
      :user            {:token      (:token response)
                        :info       (:user response)
                        :logged-in? true}})))

(re-frame/reg-event-db
 ::impersonation-error
 (fn [db [_ _error]]
   (js/console.error "Impersonation failed")
   db))

(re-frame/reg-event-db
 ::exit-impersonation
 [local-storage-interceptor]
 (fn [db _]
   (let [admin-token (get-in db [:impersonation :admin-token])
         admin-info  (get-in db [:impersonation :admin-info])]
     {:current-section :dashboard
      :user            {:token      admin-token
                        :info       admin-info
                        :logged-in? true}})))

;; ---------------------------------------------------------------------------
;; Admin export / import
;; ---------------------------------------------------------------------------

(re-frame/reg-fx
 :download-edn-file
 (fn [{:keys [data filename]}]
   (let [content (pr-str data)
         blob    (js/Blob. #js [content] #js {:type "text/plain"})
         url     (.createObjectURL js/URL blob)
         a       (.createElement js/document "a")]
     (set! (.-href a) url)
     (set! (.-download a) filename)
     (.appendChild (.-body js/document) a)
     (.click a)
     (.removeChild (.-body js/document) a)
     (.revokeObjectURL js/URL url))))

(re-frame/reg-event-fx
 ::admin-export-data
 (fn [{:keys [db]} [_ email]]
   {:db       (assoc-in db [:admin :exporting?] true)
    :dispatch [::core-events/command
               :admin-export
               {:email email}
               [::admin-export-success]
               [::admin-export-error]]}))

(re-frame/reg-event-fx
 ::admin-export-success
 (fn [{:keys [db]} [_ response]]
   {:db                (assoc-in db [:admin :exporting?] false)
    :download-edn-file {:data     response
                        :filename (str "export-" (.getTime (js/Date.)) ".edn")}}))

(re-frame/reg-event-db
 ::admin-export-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :exporting?] false)))

(re-frame/reg-event-fx
 ::admin-import-raw-edn
 (fn [{:keys [db]} [_ edn-string]]
   {:db       (assoc-in db [:admin :importing?] true)
    :dispatch [::core-events/command
               :admin-import
               (cljs.reader/read-string edn-string)
               [::admin-import-success]
               [::admin-import-error]]}))

(re-frame/reg-event-db
 ::admin-import-success
 (fn [db [_ _response]]
   (assoc-in db [:admin :importing?] false)))

(re-frame/reg-event-db
 ::admin-import-error
 (fn [db [_ _error]]
   (assoc-in db [:admin :importing?] false)))

;; ---------------------------------------------------------------------------
;; Org user management
;; ---------------------------------------------------------------------------

(re-frame/reg-event-fx
 ::load-org-users
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:team :loading?] true)
    :dispatch [::core-events/query
               {:entity :org-users}
               [::org-users-loaded]
               [::org-users-error]]}))

(re-frame/reg-event-db
 ::org-users-loaded
 [local-storage-interceptor]
 (fn [db [_ response]]
   (-> db
       (assoc-in [:team :users] (:users response))
       (assoc-in [:team :loading?] false))))

(re-frame/reg-event-db
 ::org-users-error
 (fn [db [_ _error]]
   (assoc-in db [:team :loading?] false)))

(re-frame/reg-event-fx
 ::create-org-user
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:team :saving?] true)
    :dispatch [::core-events/command
               :create-org-user
               data
               [::org-user-created]
               [::org-user-save-error]]}))

(re-frame/reg-event-fx
 ::org-user-created
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:team :saving?] false)
    :dispatch [::load-org-users]}))

(re-frame/reg-event-fx
 ::update-org-user-sections
 (fn [{:keys [db]} [_ membership-id sections]]
   {:db       (assoc-in db [:team :saving?] true)
    :dispatch [::core-events/command
               :update-org-user-sections
               {:membership-id membership-id :sections sections}
               [::org-user-sections-updated]
               [::org-user-save-error]]}))

(re-frame/reg-event-fx
 ::org-user-sections-updated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:team :saving?] false)
    :dispatch [::load-org-users]}))

(re-frame/reg-event-fx
 ::delete-org-user
 (fn [{:keys [db]} [_ account-id membership-id]]
   {:db       (assoc-in db [:team :saving?] true)
    :dispatch [::core-events/command
               :delete-org-user
               {:account-id account-id :membership-id membership-id}
               [::org-user-deleted]
               [::org-user-save-error]]}))

(re-frame/reg-event-fx
 ::org-user-deleted
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:team :saving?] false)
    :dispatch [::load-org-users]}))

(re-frame/reg-event-db
 ::org-user-save-error
 (fn [db [_ _error]]
   (assoc-in db [:team :saving?] false)))
;; ---------------------------------------------------------------------------
;; Trial
;; ---------------------------------------------------------------------------

(re-frame/reg-event-fx
 ::pause-trial
 (fn [{:keys [_db]} _]
   {:dispatch [::core-events/command
               :pause-trial
               {}
               [::trial-updated]
               [::trial-error]]}))

(re-frame/reg-event-fx
 ::resume-trial
 (fn [{:keys [_db]} _]
   {:dispatch [::core-events/command
               :resume-trial
               {}
               [::trial-updated]
               [::trial-error]]}))

(re-frame/reg-event-db
 ::trial-updated
 [local-storage-interceptor]
 (fn [db [_ response]]
   (assoc-in db [:user :info :trial] (:trial response))))

(re-frame/reg-event-db
 ::trial-error
 (fn [db [_ _error]]
   db))

(re-frame/reg-event-fx
 ::admin-pause-trial
 (fn [{:keys [_db]} [_ email]]
   {:dispatch [::core-events/command
               :admin-pause-trial
               {:email email}
               [::admin-trial-updated email]
               [::admin-users-error]]}))

(re-frame/reg-event-fx
 ::admin-resume-trial
 (fn [{:keys [_db]} [_ email]]
   {:dispatch [::core-events/command
               :admin-resume-trial
               {:email email}
               [::admin-trial-updated email]
               [::admin-users-error]]}))

(re-frame/reg-event-fx
 ::admin-extend-trial
 (fn [{:keys [_db]} [_ email extra-days]]
   {:dispatch [::core-events/command
               :admin-extend-trial
               {:email email :extra-days extra-days}
               [::admin-trial-updated email]
               [::admin-users-error]]}))

(re-frame/reg-event-db
 ::admin-trial-updated
 (fn [db [_ email response]]
   (update-in db [:admin :users]
              (fn [users]
                (mapv (fn [u] (if (= (:email u) email) (assoc u :trial (:trial response)) u))
                      (or users []))))))
