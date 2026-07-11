(ns app.accounting-ui.events
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-event-fx
 ::load-journal-entries
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:accounting :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :journal-entry}
               [::journal-entries-loaded]
               [::journal-entries-error]]}))

(re-frame/reg-event-db
 ::journal-entries-loaded
 (fn [db [_ {:keys [journal-entries]}]]
   (-> db
       (assoc-in [:accounting :journal-entries] (or journal-entries []))
       (assoc-in [:accounting :loading?] false))))

(re-frame/reg-event-db
 ::journal-entries-error
 (fn [db _]
   (assoc-in db [:accounting :loading?] false)))

(re-frame/reg-event-fx
 ::create-journal-entry
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:accounting :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-journal-entry
               data
               [::journal-entry-mutated]
               [::journal-entry-error]]}))

(re-frame/reg-event-fx
 ::storno-journal-entry
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:accounting :saving?] true)
    :dispatch [:app.core-ui.events/command
               :storno-journal-entry
               {:id id}
               [::journal-entry-mutated]
               [::journal-entry-error]]}))

(re-frame/reg-event-fx
 ::journal-entry-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:accounting :saving?] false)
    :dispatch [::load-journal-entries]}))

(re-frame/reg-event-db
 ::journal-entry-error
 (fn [db _]
   (assoc-in db [:accounting :saving?] false)))

;; ── Accounting onboarding (Eröffnungsbilanz) ──────────────────────────────

(re-frame/reg-event-fx
 ::load-accounting-onboarding
 (fn [_ _]
   {:dispatch [:app.core-ui.events/command
               :get-accounting-onboarding
               {}
               [::accounting-onboarding-loaded]
               [::accounting-onboarding-error]]}))

(re-frame/reg-event-db
 ::accounting-onboarding-loaded
 (fn [db [_ {:keys [onboarding opening-balances]}]]
   (-> db
       (assoc-in [:accounting :onboarding] onboarding)
       (assoc-in [:accounting :opening-balances] (or opening-balances []))
       (assoc-in [:accounting :onboarding-loaded?] true))))

(re-frame/reg-event-db
 ::accounting-onboarding-error
 (fn [db _]
   (assoc-in db [:accounting :onboarding-loaded?] true)))

(re-frame/reg-event-fx
 ::complete-accounting-onboarding
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:accounting :saving?] true)
    :dispatch [:app.core-ui.events/command
               :complete-accounting-onboarding
               data
               [::accounting-onboarding-completed]
               [::journal-entry-error]]}))

(re-frame/reg-event-fx
 ::accounting-onboarding-completed
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:accounting :saving?] false)
    :dispatch [::load-accounting-onboarding]}))
