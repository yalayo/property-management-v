(ns app.property-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.property-ui.db :as db]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::load-properties
 (fn [_ _]
   {:dispatch [:app.core-ui.events/query
               {:entity :property}
               [::properties-loaded]
               [::properties-error]]}))

(re-frame/reg-event-db
 ::properties-loaded
 [local-storage-interceptor]
 (fn [db [_ {:keys [properties]}]]
   (-> db
       (assoc-in [:properties :list] properties)
       (assoc-in [:properties :loading?] false))))

(re-frame/reg-event-fx
 ::properties-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load properties:" error)
   {}))

(re-frame/reg-event-fx
 ::add-property
 (fn [{:keys [db]} [_ property-data]]
   {:db       (assoc-in db [:properties :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-property
               property-data
               [::property-added]
               [::property-save-error]]}))

(re-frame/reg-event-fx
 ::property-added
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-db
 ::property-save-error
 [local-storage-interceptor]
 (fn [db [_ error]]
   (js/console.error "Failed to save property:" error)
   (assoc-in db [:properties :saving?] false)))

(re-frame/reg-event-fx
 ::update-property
 (fn [{:keys [db]} [_ id property-data]]
   {:db       (assoc-in db [:properties :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-property
               (assoc property-data :id id)
               [::property-updated]
               [::property-save-error]]}))

(re-frame/reg-event-fx
 ::property-updated
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-fx
 ::delete-property
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:properties :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-property
               {:id id}
               [::property-deleted]
               [::property-save-error]]}))

(re-frame/reg-event-fx
 ::property-deleted
 [local-storage-interceptor]
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:properties :saving?] false)
    :dispatch [::load-properties]}))

(re-frame/reg-event-db
 ::go-to-dashboard
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:ui :active-section] "dashboard")))
