(ns app.tax-ui.events
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-event-fx
 ::load-tax-data
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :loading?] true)
    :dispatch-n [[:app.core-ui.events/query
                  {:entity :property-tax-config}
                  [::tax-configs-loaded]
                  [::tax-error]]
                 [:app.core-ui.events/query
                  {:entity :property-loan}
                  [::loans-loaded]
                  [::tax-error]]
                 [:app.core-ui.events/query
                  {:entity :property-maintenance}
                  [::maintenances-loaded]
                  [::tax-error]]]}))

(re-frame/reg-event-db
 ::tax-configs-loaded
 (fn [db [_ {:keys [property-tax-configs]}]]
   (-> db
       (assoc-in [:tax :configs] (or property-tax-configs []))
       (assoc-in [:tax :loading?] false))))

(re-frame/reg-event-db
 ::loans-loaded
 (fn [db [_ {:keys [property-loans]}]]
   (assoc-in db [:tax :loans] (or property-loans []))))

(re-frame/reg-event-db
 ::tax-error
 (fn [db _]
   (assoc-in db [:tax :loading?] false)))

(re-frame/reg-event-fx
 ::save-tax-config
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :upsert-property-tax-config
               data
               [::tax-config-saved]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::tax-config-saved
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :saving?] false)
    :dispatch [:app.core-ui.events/query
               {:entity :property-tax-config}
               [::tax-configs-loaded]
               [::tax-error]]}))

(re-frame/reg-event-fx
 ::create-loan
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-property-loan
               data
               [::loan-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::update-loan
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-property-loan
               data
               [::loan-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::delete-loan
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-property-loan
               {:id id}
               [::loan-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::loan-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :saving?] false)
    :dispatch [:app.core-ui.events/query
               {:entity :property-loan}
               [::loans-loaded]
               [::tax-error]]}))

(re-frame/reg-event-db
 ::tax-save-error
 (fn [db _]
   (assoc-in db [:tax :saving?] false)))

;; ── Maintenance (Erhaltungsaufwand) ────────────────────────────────────────

(re-frame/reg-event-db
 ::maintenances-loaded
 (fn [db [_ {:keys [property-maintenances]}]]
   (assoc-in db [:tax :maintenances] (or property-maintenances []))))

(re-frame/reg-event-fx
 ::create-maintenance
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-property-maintenance
               data
               [::maintenance-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::update-maintenance
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-property-maintenance
               data
               [::maintenance-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::delete-maintenance
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-property-maintenance
               {:id id}
               [::maintenance-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::maintenance-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :saving?] false)
    :dispatch [:app.core-ui.events/query
               {:entity :property-maintenance}
               [::maintenances-loaded]
               [::tax-error]]}))
