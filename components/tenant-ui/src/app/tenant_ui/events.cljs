(ns app.tenant-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.tenant-ui.db :as db]
            [app.tenant-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

;; ── Loading ────────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-tenants
 (fn [_ _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/tenants")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::tenants-loaded]
                 :on-failure      [::tenants-error]}}))

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
 (fn [{:keys [db]} [_ {:keys [name email phone start-date apartment-id]}]]
   {:db         (assoc-in db [:tenants :saving?] true)
    :http-xhrio {:method          :post
                 :uri             (str (config/get-api-url) "/api/tenants")
                 :params          {:name         name
                                   :email        email
                                   :phone        phone
                                   :start-date   start-date
                                   :apartment-id apartment-id}
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::tenant-added]
                 :on-failure      [::tenant-save-error]}}))

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
   {:db         (assoc-in db [:tenants :saving?] true)
    :http-xhrio {:method          :put
                 :uri             (str (config/get-api-url) "/api/tenants/" id)
                 :params          data
                 :format          (ajax-edn/edn-request-format)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::tenant-updated]
                 :on-failure      [::tenant-save-error]}}))

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
   {:db         (assoc-in db [:tenants :saving?] true)
    :http-xhrio {:method          :delete
                 :uri             (str (config/get-api-url) "/api/tenants/" id)
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::tenant-deleted]
                 :on-failure      [::tenant-save-error]}}))

(re-frame/reg-event-fx
 ::tenant-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:tenants :saving?] false)
                  (assoc-in [:tenants :selected-id] nil))
    :dispatch [::load-tenants]}))
