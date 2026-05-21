(ns app.apartment-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.apartment-ui.db :as db]
            [app.apartment-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::set-property-filter
 [local-storage-interceptor]
 (fn [db [_ property]]
   (assoc-in db [:apartments :property-filter] property)))

(re-frame/reg-event-fx
 ::load-apartments
 (fn [{:keys [db]} _]
   (let [token       (get-in db [:user :token] "")
         property-id (get-in db [:apartments :property-filter :id])]
     {:http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          (cond-> {:entity :apartment}
                                      property-id (assoc :property-id property-id))
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartments-loaded]
                   :on-failure      [::apartments-error]}})))

(re-frame/reg-event-fx
 ::apartments-loaded
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ {:keys [apartments]}]]
   {:db       (-> db
                  (assoc-in [:apartments :list] apartments)
                  (assoc-in [:apartments :loading?] false))
    :dispatch [::load-all-onboardings]}))

(re-frame/reg-event-fx
 ::load-all-onboardings
 (fn [{:keys [db]} _]
   (let [token (get-in db [:user :token] "")]
     {:http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/query")
                   :params          {:entity :onboarding}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::all-onboardings-loaded]
                   :on-failure      [::apartments-error]}})))

(re-frame/reg-event-db
 ::all-onboardings-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [onboardings]}]]
   (assoc-in db [:apartments :onboardings] onboardings)))

(re-frame/reg-event-fx
 ::apartments-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load apartments:" error)
   {}))

(re-frame/reg-event-db
 ::open-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:apartments :add-dialog-open?] true)
       (assoc-in [:apartments :new-code] "")
       (assoc-in [:apartments :new-property-id] nil))))

(re-frame/reg-event-db
 ::close-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :add-dialog-open?] false)))

(re-frame/reg-event-db
 ::set-new-code
 [local-storage-interceptor]
 (fn [db [_ code]]
   (assoc-in db [:apartments :new-code] code)))

(re-frame/reg-event-db
 ::set-new-property-id
 [local-storage-interceptor]
 (fn [db [_ property-id]]
   (assoc-in db [:apartments :new-property-id] property-id)))

(re-frame/reg-event-fx
 ::add-apartment
 (fn [{:keys [db]} _]
   (let [token       (get-in db [:user :token] "")
         code        (get-in db [:apartments :new-code])
         property-id (get-in db [:apartments :new-property-id])]
     {:db         (assoc-in db [:apartments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-apartment
                                     :data    {:code code :property-id property-id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartment-added]
                   :on-failure      [::apartment-save-error]}})))

(re-frame/reg-event-fx
 ::apartment-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :add-dialog-open?] false))
    :dispatch [::load-apartments]}))

(re-frame/reg-event-db
 ::apartment-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save apartment:" error)
   (assoc-in db [:apartments :saving?] false)))

(re-frame/reg-event-fx
 ::select-apartment
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ id]]
   {:db       (-> db
                  (assoc-in [:apartments :selected-id] id)
                  (assoc-in [:apartments :onboarding-status] nil))
    :dispatch [::load-onboarding id]}))

(re-frame/reg-event-db
 ::clear-selected-apartment
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:apartments :selected-id] nil)
       (assoc-in [:apartments :onboarding-status] nil))))

(re-frame/reg-event-fx
 ::load-onboarding
 (fn [{:keys [db]} [_ apartment-id]]
   (let [token (get-in db [:user :token] "")]
     {:http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :get-onboarding
                                     :data    {:apartment-id apartment-id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::onboarding-loaded]
                   :on-failure      [::onboarding-load-error]}})))

(re-frame/reg-event-db
 ::onboarding-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [onboarding]}]]
   (assoc-in db [:apartments :onboarding-status] onboarding)))

(re-frame/reg-event-db
 ::onboarding-load-error
 (fn [db _]
   (assoc-in db [:apartments :onboarding-status] nil)))

(re-frame/reg-event-fx
 ::delete-apartment
 (fn [{:keys [db]} [_ id]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :delete-apartment :data {:id id}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartment-deleted]
                   :on-failure      [::apartment-save-error]}})))

(re-frame/reg-event-fx
 ::apartment-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :selected-id] nil))
    :dispatch [::load-apartments]}))

(re-frame/reg-event-fx
 ::update-apartment
 (fn [{:keys [db]} [_ id data]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :update-apartment :data (assoc data :id id)}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::apartment-updated]
                   :on-failure      [::apartment-save-error]}})))

(re-frame/reg-event-fx
 ::apartment-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:apartments :saving?] false)
    :dispatch [::load-apartments]}))

;; ── Assign tenant ─────────────────────────────────────────────────────────

(re-frame/reg-event-db
 ::open-assign-dialog
 [local-storage-interceptor]
 (fn [db [_ apt-id]]
   (assoc-in db [:apartments :assign-apt-id] apt-id)))

(re-frame/reg-event-db
 ::close-assign-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :assign-apt-id] nil)))

(re-frame/reg-event-fx
 ::assign-tenant
 (fn [{:keys [db]} [_ apt-id {:keys [name email phone start-date]}]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartments :saving?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :create-tenant
                                     :data    {:apartment-id apt-id
                                               :name         name
                                               :email        email
                                               :phone        phone
                                               :start-date   start-date}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::tenant-assigned apt-id]
                   :on-failure      [::apartment-save-error]}})))

(re-frame/reg-event-fx
 ::tenant-assigned
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ apt-id]]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :assign-apt-id] nil))
    :dispatch [::update-apartment apt-id {:occupied true}]}))

;; ── Tenant onboarding ─────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::start-onboarding
 (fn [{:keys [db]} [_ apt-id email]]
   (let [token (get-in db [:user :token] "")]
     {:db         (assoc-in db [:apartments :onboarding?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/command")
                   :params          {:command :start-onboarding
                                     :data    {:apartment-id apt-id :email email}}
                   :headers         {"Authorization" (str "Bearer " token)}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::onboarding-sent]
                   :on-failure      [::onboarding-error]}})))

(re-frame/reg-event-fx
 ::onboarding-sent
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   (let [id (get-in db [:apartments :selected-id])]
     {:db       (assoc-in db [:apartments :onboarding?] false)
      :dispatch [::load-onboarding id]})))

(re-frame/reg-event-db
 ::onboarding-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to start onboarding:" error)
   (assoc-in db [:apartments :onboarding?] false)))
