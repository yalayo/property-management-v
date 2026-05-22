(ns app.rent-ui.events
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-event-fx
 ::load-rent-payments
 (fn [{:keys [db]} [_ apartment-id]]
   {:db       (-> db
                  (assoc-in [:rent-payments :loading?] true)
                  (assoc-in [:rent-payments :apartment-id] apartment-id))
    :dispatch [:app.core-ui.events/query
               {:entity :rent-payment :apartment-id apartment-id}
               [::rent-payments-loaded]
               [::rent-error]]}))

(re-frame/reg-event-db
 ::rent-payments-loaded
 (fn [db [_ {:keys [rent-payments]}]]
   (-> db
       (assoc-in [:rent-payments :list] rent-payments)
       (assoc-in [:rent-payments :loading?] false))))

(re-frame/reg-event-db
 ::rent-error
 (fn [db _]
   (assoc-in db [:rent-payments :loading?] false)))

(re-frame/reg-event-fx
 ::create-rent-payment
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:rent-payments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-rent-payment
               data
               [::rent-payment-mutated]
               [::rent-save-error]]}))

(re-frame/reg-event-fx
 ::update-rent-payment
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:rent-payments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-rent-payment
               data
               [::rent-payment-mutated]
               [::rent-save-error]]}))

(re-frame/reg-event-fx
 ::delete-rent-payment
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:rent-payments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-rent-payment
               {:id id}
               [::rent-payment-mutated]
               [::rent-save-error]]}))

(re-frame/reg-event-fx
 ::rent-payment-mutated
 (fn [{:keys [db]} _]
   (let [apartment-id (get-in db [:rent-payments :apartment-id])]
     {:db       (assoc-in db [:rent-payments :saving?] false)
      :dispatch [::load-rent-payments apartment-id]})))

(re-frame/reg-event-db
 ::rent-save-error
 (fn [db _]
   (assoc-in db [:rent-payments :saving?] false)))
