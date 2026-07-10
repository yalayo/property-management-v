(ns app.tenant-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.tenant-ui.db :as db]))

(def local-storage-interceptor (after db/db->local-store))

;; ── Loading ────────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-tenants
 (fn [_ _]
   {:dispatch [:app.core-ui.events/query
               {:entity :tenant}
               [::tenants-loaded]
               [::tenants-error]]}))

(re-frame/reg-event-db
 ::tenants-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [tenants]}]]
   (-> db
       (assoc-in [:tenants :list] tenants)
       (assoc-in [:tenants :loading?] false))))

(re-frame/reg-event-fx
 ::tenants-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load tenants:" error)
   {}))

;; ── Add dialog ────────────────────────────────────────────────────────────

(re-frame/reg-event-db
 ::open-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:tenants :add-dialog-open?] true)))

(re-frame/reg-event-db
 ::close-add-dialog
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:tenants :add-dialog-open?] false)))

;; ── Add tenant ────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::add-tenant
 (fn [{:keys [db]} [_ {:keys [first-name last-name email phone start-date end-date apartment-id]}]]
   {:db       (assoc-in db [:tenants :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-tenant
               (cond-> {:first-name first-name
                        :last-name  last-name
                        :email      email
                        :phone      phone
                        :start-date start-date
                        :end-date   end-date}
                 apartment-id (assoc :apartment-id apartment-id))
               [::tenant-added]
               [::tenant-save-error]]}))

(re-frame/reg-event-fx
 ::tenant-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:tenants :saving?] false)
                  (assoc-in [:tenants :add-dialog-open?] false))
    :dispatch [::load-tenants]}))

(re-frame/reg-event-db
 ::tenant-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save tenant:" error)
   (assoc-in db [:tenants :saving?] false)))

;; ── Select / manage ───────────────────────────────────────────────────────

(re-frame/reg-event-db
 ::select-tenant
 [local-storage-interceptor]
 (fn [db [_ id]]
   (assoc-in db [:tenants :selected-id] id)))

(re-frame/reg-event-db
 ::clear-selected-tenant
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:tenants :selected-id] nil)))

;; ── Update ───────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::update-tenant
 (fn [{:keys [db]} [_ id data]]
   {:db       (assoc-in db [:tenants :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-tenant
               (assoc data :id id)
               [::tenant-updated]
               [::tenant-save-error]]}))

(re-frame/reg-event-fx
 ::tenant-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tenants :saving?] false)
    :dispatch [::load-tenants]}))

;; ── Delete ───────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::delete-tenant
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tenants :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-tenant
               {:id id}
               [::tenant-deleted]
               [::tenant-save-error]]}))

(re-frame/reg-event-fx
 ::tenant-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:tenants :saving?] false)
                  (assoc-in [:tenants :selected-id] nil))
    :dispatch [::load-tenants]}))

;; ── Residents-count-changes ──────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-residents-count-changes
 (fn [_ _]
   {:dispatch [:app.core-ui.events/command
               :get-all-residents-count-changes
               {}
               [::residents-count-changes-loaded]
               [::residents-count-changes-error]]}))

(re-frame/reg-event-db
 ::residents-count-changes-loaded
 (fn [db [_ {:keys [residents-count-changes]}]]
   (assoc-in db [:tenants :persons-changes] (or residents-count-changes []))))

(re-frame/reg-event-fx
 ::residents-count-changes-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load residents count changes:" error)
   {}))

(re-frame/reg-event-fx
 ::create-residents-count-change
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tenants :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-residents-count-change
               data
               [::residents-count-change-saved]
               [::tenant-save-error]]}))

(re-frame/reg-event-fx
 ::residents-count-change-saved
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tenants :saving?] false)
    :dispatch [::load-residents-count-changes]}))

(re-frame/reg-event-fx
 ::delete-residents-count-change
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tenants :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-residents-count-change
               {:id id}
               [::residents-count-change-saved]
               [::tenant-save-error]]}))
