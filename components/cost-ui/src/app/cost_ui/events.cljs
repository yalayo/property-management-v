(ns app.cost-ui.events
  (:require [re-frame.core :as re-frame]))

;; ── Property costs ────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-costs
 (fn [{:keys [db]} [_ property-id]]
   {:db       (-> db
                  (assoc-in [:costs :loading?] true)
                  (assoc-in [:costs :property-id] property-id))
    :dispatch [:app.core-ui.events/query
               {:entity :cost :property-id property-id}
               [::costs-loaded]
               [::costs-error]]}))

(re-frame/reg-event-db
 ::costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:costs :list] costs)
       (assoc-in [:costs :loading?] false))))

(re-frame/reg-event-db
 ::costs-error
 (fn [db _]
   (assoc-in db [:costs :loading?] false)))

(re-frame/reg-event-fx
 ::create-cost
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-cost
               data
               [::cost-mutated]
               [::cost-error]]}))

(re-frame/reg-event-fx
 ::update-cost
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-cost
               data
               [::cost-mutated]
               [::cost-error]]}))

(re-frame/reg-event-fx
 ::delete-cost
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-cost
               {:id id}
               [::cost-mutated]
               [::cost-error]]}))

(re-frame/reg-event-fx
 ::cost-mutated
 (fn [{:keys [db]} _]
   (let [property-id (get-in db [:costs :property-id])]
     {:db       (assoc-in db [:costs :saving?] false)
      :dispatch [::load-costs property-id]})))

(re-frame/reg-event-db
 ::cost-error
 (fn [db _]
   (assoc-in db [:costs :saving?] false)))

;; ── Apartment costs ───────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-apartment-costs
 (fn [{:keys [db]} [_ apartment-id]]
   {:db       (-> db
                  (assoc-in [:apartment-costs :loading?] true)
                  (assoc-in [:apartment-costs :apartment-id] apartment-id))
    :dispatch [:app.core-ui.events/query
               {:entity :apartment-cost :apartment-id apartment-id}
               [::apt-costs-loaded]
               [::apt-costs-error]]}))

(re-frame/reg-event-db
 ::apt-costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:apartment-costs :list] costs)
       (assoc-in [:apartment-costs :loading?] false))))

(re-frame/reg-event-db
 ::apt-costs-error
 (fn [db _]
   (assoc-in db [:apartment-costs :loading?] false)))

(re-frame/reg-event-fx
 ::create-apartment-cost
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:apartment-costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-apartment-cost
               data
               [::apt-cost-mutated]
               [::apt-cost-error]]}))

(re-frame/reg-event-fx
 ::update-apartment-cost
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:apartment-costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-apartment-cost
               data
               [::apt-cost-mutated]
               [::apt-cost-error]]}))

(re-frame/reg-event-fx
 ::delete-apartment-cost
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:apartment-costs :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-apartment-cost
               {:id id}
               [::apt-cost-mutated]
               [::apt-cost-error]]}))

(re-frame/reg-event-fx
 ::apt-cost-mutated
 (fn [{:keys [db]} _]
   (let [apartment-id (get-in db [:apartment-costs :apartment-id])]
     {:db       (assoc-in db [:apartment-costs :saving?] false)
      :dispatch [::load-apartment-costs apartment-id]})))

(re-frame/reg-event-db
 ::apt-cost-error
 (fn [db _]
   (assoc-in db [:apartment-costs :saving?] false)))
