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

;; ── Other income / expenses (Anlage V supplemental) ───────────────────────

(re-frame/reg-event-fx
 ::load-tax-incomes
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :incomes-loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :tax-income}
               [::tax-incomes-loaded]
               [::tax-error]]}))

(re-frame/reg-event-db
 ::tax-incomes-loaded
 (fn [db [_ {:keys [tax-incomes]}]]
   (-> db
       (assoc-in [:tax :incomes] (or tax-incomes []))
       (assoc-in [:tax :incomes-loading?] false))))

(re-frame/reg-event-fx
 ::create-tax-income
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-tax-income
               data
               [::tax-income-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::delete-tax-income
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-tax-income
               {:id id}
               [::tax-income-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::tax-income-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :saving?] false)
    :dispatch [::load-tax-incomes]}))

(re-frame/reg-event-fx
 ::load-tax-expenses
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :expenses-loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :tax-expense}
               [::tax-expenses-loaded]
               [::tax-error]]}))

(re-frame/reg-event-db
 ::tax-expenses-loaded
 (fn [db [_ {:keys [tax-expenses]}]]
   (-> db
       (assoc-in [:tax :expenses] (or tax-expenses []))
       (assoc-in [:tax :expenses-loading?] false))))

(re-frame/reg-event-fx
 ::create-tax-expense
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-tax-expense
               data
               [::tax-expense-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::delete-tax-expense
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tax :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-tax-expense
               {:id id}
               [::tax-expense-mutated]
               [::tax-save-error]]}))

(re-frame/reg-event-fx
 ::tax-expense-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tax :saving?] false)
    :dispatch [::load-tax-expenses]}))
