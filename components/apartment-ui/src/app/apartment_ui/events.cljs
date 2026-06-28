(ns app.apartment-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [clojure.string :as str]
            [app.apartment-ui.db :as db]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-fx
 :call-fn
 (fn [f] (when (fn? f) (f))))

(re-frame/reg-event-db
 ::set-property-filter
 [local-storage-interceptor]
 (fn [db [_ property]]
   (assoc-in db [:apartments :property-filter] property)))

(re-frame/reg-event-fx
 ::load-apartments
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:apartments :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :apartment}
               [::apartments-loaded]
               [::apartments-error]]}))

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
 (fn [_ _]
   {:dispatch [:app.core-ui.events/query
               {:entity :onboarding}
               [::all-onboardings-loaded]
               [::apartments-error]]}))

(re-frame/reg-event-db
 ::all-onboardings-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [onboardings]}]]
   (assoc-in db [:apartments :onboardings] onboardings)))

(re-frame/reg-event-fx
 ::apartments-error
 (fn [{:keys [db]} [_ error]]
   (js/console.error "Failed to load apartments:" error)
   {:db (assoc-in db [:apartments :loading?] false)}))

(re-frame/reg-event-db
 ::open-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:apartments :add-dialog-open?] true)
       (assoc-in [:apartments :new-code] "")
       (assoc-in [:apartments :new-property-id] nil)
       (assoc-in [:apartments :new-wohnflaeche] nil)
       (assoc-in [:apartments :new-strom-zaehler-nr] "")
       (assoc-in [:apartments :new-wasser-zaehler-nrn] []))))

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

(re-frame/reg-event-db
 ::set-new-wohnflaeche
 [local-storage-interceptor]
 (fn [db [_ wohnflaeche]]
   (assoc-in db [:apartments :new-wohnflaeche] wohnflaeche)))

(re-frame/reg-event-db
 ::set-new-strom-zaehler-nr
 [local-storage-interceptor]
 (fn [db [_ nr]]
   (assoc-in db [:apartments :new-strom-zaehler-nr] nr)))

(re-frame/reg-event-db
 ::set-new-wasser-zaehler-nrn
 [local-storage-interceptor]
 (fn [db [_ nrn]]
   (assoc-in db [:apartments :new-wasser-zaehler-nrn] (vec nrn))))

(re-frame/reg-event-fx
 ::add-apartment
 (fn [{:keys [db]} _]
   (let [code         (get-in db [:apartments :new-code])
         property-id  (get-in db [:apartments :new-property-id])
         wohnflaeche  (get-in db [:apartments :new-wohnflaeche])
         strom        (get-in db [:apartments :new-strom-zaehler-nr])
         wasser       (->> (get-in db [:apartments :new-wasser-zaehler-nrn] [])
                           (map str/trim)
                           (remove empty?)
                           vec)
         strom-trim   (str/trim (or strom ""))]
     {:db       (assoc-in db [:apartments :saving?] true)
      :dispatch [:app.core-ui.events/command
                 :create-apartment
                 (cond-> {:code code :property-id property-id}
                   (some? wohnflaeche)   (assoc :wohnflaeche wohnflaeche)
                   (seq strom-trim)      (assoc :strom-zaehler-nr strom-trim)
                   (seq wasser)          (assoc :wasser-zaehler-nrn wasser))
                 [::apartment-added]
                 [::apartment-save-error]]})))

(re-frame/reg-event-fx
 ::apartment-added
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ {:keys [apartment-id]}]]
   (let [new-code        (get-in db [:apartments :new-code])
         new-property-id (get-in db [:apartments :new-property-id])
         new-apt         {:db/id                 apartment-id
                          :apartment/code        new-code
                          :apartment/property-id new-property-id
                          :apartment/occupied    false}]
     {:db       (-> db
                    (assoc-in [:apartments :saving?] false)
                    (assoc-in [:apartments :add-dialog-open?] false)
                    (update-in [:apartments :list] (fnil conj []) new-apt))
      :dispatch [::load-apartments]})))

(re-frame/reg-event-db
 ::apartment-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save apartment:" error)
   (assoc-in db [:apartments :saving?] false)))

(re-frame/reg-event-fx
 ::select-apartment
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ id initial-tab]]
   {:db       (-> db
                  (assoc-in [:apartments :selected-id] id)
                  (assoc-in [:apartments :initial-tab] initial-tab)
                  (assoc-in [:apartments :onboarding-status] nil)
                  (assoc-in [:garages :selected-id] nil))
    :dispatch [::load-onboarding id]}))

(re-frame/reg-event-db
 ::clear-selected-apartment
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:apartments :selected-id] nil)
       (assoc-in [:apartments :onboarding-status] nil))))

(re-frame/reg-event-db
 ::set-apartment-tab
 [local-storage-interceptor]
 (fn [db [_ tab]]
   (assoc-in db [:apartments :initial-tab] tab)))

(re-frame/reg-event-db
 ::set-apartment-year
 [local-storage-interceptor]
 (fn [db [_ year]]
   (assoc-in db [:apartments :current-year] year)))

(re-frame/reg-event-fx
 ::load-onboarding
 (fn [_ [_ apartment-id]]
   {:dispatch [:app.core-ui.events/command
               :get-onboarding
               {:apartment-id apartment-id}
               [::onboarding-loaded]
               [::onboarding-load-error]]}))

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
   {:db       (assoc-in db [:apartments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-apartment
               {:id id}
               [::apartment-deleted]
               [::apartment-save-error]]}))

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
   {:db       (assoc-in db [:apartments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-apartment
               (assoc data :id id)
               [::apartment-updated]
               [::apartment-save-error]]}))

(re-frame/reg-event-fx
 ::apartment-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:apartments :saving?] false)
    :dispatch [::load-apartments]}))

;; ── Apartment detail ──────────────────────────────────────────────────────

(re-frame/reg-event-db
 ::select-apartment-detail
 [local-storage-interceptor]
 (fn [db [_ id]]
   (assoc-in db [:apartments :detail-id] id)))

(re-frame/reg-event-db
 ::clear-apartment-detail
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :detail-id] nil)))

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
   (-> db
       (assoc-in [:apartments :assign-apt-id] nil)
       (assoc-in [:apartments :assign-error] nil))))

(re-frame/reg-event-fx
 ::assign-tenant
 (fn [{:keys [db]} [_ apt-id {:keys [first-name last-name email phone start-date end-date]} on-after]]
   {:db       (assoc-in db [:apartments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-tenant
               {:apartment-id apt-id
                :first-name   first-name
                :last-name    last-name
                :email        email
                :phone        phone
                :start-date   start-date
                :end-date     end-date}
               [::tenant-assigned apt-id on-after]
               [::assign-tenant-error]]}))

(re-frame/reg-event-db
 ::assign-tenant-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (-> db
       (assoc-in [:apartments :saving?] false)
       (assoc-in [:apartments :assign-error] (get-in error [:response :error])))))

(re-frame/reg-event-db
 ::clear-assign-error
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:apartments :assign-error] nil)))

(re-frame/reg-event-fx
 ::tenant-assigned
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ apt-id on-after]]
   {:db       (-> db
                  (assoc-in [:apartments :saving?] false)
                  (assoc-in [:apartments :assign-apt-id] nil)
                  (assoc-in [:apartments :assign-error] nil))
    :dispatch [::update-apartment apt-id {:occupied true}]
    :call-fn  on-after}))

(re-frame/reg-event-fx
 ::assign-existing-tenant
 (fn [{:keys [db]} [_ apt-id tenant-id]]
   {:db       (assoc-in db [:apartments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :assign-tenant-to-apartment
               {:tenant-id    tenant-id
                :apartment-id apt-id}
               [::existing-tenant-assigned]
               [::apartment-save-error]]}))

(re-frame/reg-event-fx
 ::existing-tenant-assigned
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:apartments :saving?] false)
    :dispatch [::load-apartments]}))

;; ── Garages ───────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-garages
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:garages :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :garage}
               [::garages-loaded]
               [::garages-error]]}))

(re-frame/reg-event-db
 ::garages-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [garages]}]]
   (-> db
       (assoc-in [:garages :list] garages)
       (assoc-in [:garages :loading?] false))))

(re-frame/reg-event-db
 ::garages-error
 (fn [db _]
   (assoc-in db [:garages :loading?] false)))

(re-frame/reg-event-fx
 ::select-garage
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ id]]
   {:db (-> db
            (assoc-in [:garages :selected-id] id)
            (assoc-in [:apartments :selected-id] nil))}))

(re-frame/reg-event-db
 ::clear-selected-garage
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:garages :selected-id] nil)))

(re-frame/reg-event-fx
 ::add-garage
 (fn [{:keys [db]} _]
   (let [code         (get-in db [:garages :new-code])
         property-id  (get-in db [:garages :new-property-id])
         flaeche      (get-in db [:garages :new-flaeche])
         monthly-rent (get-in db [:garages :new-monthly-rent])]
     {:db       (assoc-in db [:garages :saving?] true)
      :dispatch [:app.core-ui.events/command
                 :create-garage
                 (cond-> {:code code :property-id property-id}
                   (some? flaeche)      (assoc :flaeche flaeche)
                   (some? monthly-rent) (assoc :monthly-rent monthly-rent))
                 [::garage-added]
                 [::garage-save-error]]})))

(re-frame/reg-event-fx
 ::garage-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:garages :saving?] false)
                  (assoc-in [:garages :add-dialog-open?] false))
    :dispatch [::load-garages]}))

(re-frame/reg-event-db
 ::garage-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save garage:" error)
   (assoc-in db [:garages :saving?] false)))

(re-frame/reg-event-fx
 ::update-garage
 (fn [{:keys [db]} [_ id data]]
   {:db       (assoc-in db [:garages :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-garage
               (assoc data :id id)
               [::garage-updated]
               [::garage-save-error]]}))

(re-frame/reg-event-fx
 ::garage-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:garages :saving?] false)
    :dispatch [::load-garages]}))

(re-frame/reg-event-fx
 ::delete-garage
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:garages :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-garage
               {:id id}
               [::garage-deleted]
               [::garage-save-error]]}))

(re-frame/reg-event-fx
 ::garage-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:garages :saving?] false)
                  (assoc-in [:garages :selected-id] nil))
    :dispatch [::load-garages]}))

(re-frame/reg-event-db
 ::open-add-garage-dialog
 [local-storage-interceptor]
 (fn [db _]
   (-> db
       (assoc-in [:garages :add-dialog-open?] true)
       (assoc-in [:garages :new-code] "")
       (assoc-in [:garages :new-property-id] nil)
       (assoc-in [:garages :new-flaeche] nil)
       (assoc-in [:garages :new-monthly-rent] nil))))

(re-frame/reg-event-db
 ::close-add-garage-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:garages :add-dialog-open?] false)))

(re-frame/reg-event-db
 ::set-new-garage-code
 [local-storage-interceptor]
 (fn [db [_ code]]
   (assoc-in db [:garages :new-code] code)))

(re-frame/reg-event-db
 ::set-new-garage-property-id
 [local-storage-interceptor]
 (fn [db [_ property-id]]
   (assoc-in db [:garages :new-property-id] property-id)))

(re-frame/reg-event-db
 ::set-new-garage-flaeche
 [local-storage-interceptor]
 (fn [db [_ flaeche]]
   (assoc-in db [:garages :new-flaeche] flaeche)))

(re-frame/reg-event-db
 ::set-new-garage-monthly-rent
 [local-storage-interceptor]
 (fn [db [_ monthly-rent]]
   (assoc-in db [:garages :new-monthly-rent] monthly-rent)))

;; ── Tenant onboarding ─────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::start-onboarding
 (fn [{:keys [db]} [_ apt-id email]]
   {:db       (assoc-in db [:apartments :onboarding?] true)
    :dispatch [:app.core-ui.events/command
               :start-onboarding
               {:apartment-id apt-id :email email}
               [::onboarding-sent]
               [::onboarding-error]]}))

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
