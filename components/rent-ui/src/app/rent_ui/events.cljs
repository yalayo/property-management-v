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

(re-frame/reg-event-fx
 ::create-rent-payments-batch
 (fn [{:keys [db]} [_ payments apartment-id]]
   (if (empty? payments)
     {:db       (assoc-in db [:rent-payments :saving?] false)
      :dispatch [::load-rent-payments apartment-id]}
     {:db       (assoc-in db [:rent-payments :saving?] true)
      :dispatch [:app.core-ui.events/command
                 :create-rent-payment
                 (first payments)
                 [::rent-payments-batch-continue (vec (rest payments)) apartment-id]
                 [::rent-save-error]]})))

(re-frame/reg-event-fx
 ::rent-payments-batch-continue
 (fn [_ [_ remaining apartment-id _response]]
   {:dispatch [::create-rent-payments-batch remaining apartment-id]}))

;; ── Garage payments ───────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-all-garage-payments
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:garage-payments :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :garage-payment}
               [::garage-payments-loaded]
               [::garage-payments-error]]}))

(re-frame/reg-event-db
 ::garage-payments-loaded
 (fn [db [_ {:keys [garage-payments]}]]
   (-> db
       (assoc-in [:garage-payments :list] garage-payments)
       (assoc-in [:garage-payments :loading?] false))))

(re-frame/reg-event-db
 ::garage-payments-error
 (fn [db _]
   (assoc-in db [:garage-payments :loading?] false)))

(re-frame/reg-event-fx
 ::create-garage-payment
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:garage-payments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-garage-payment
               data
               [::garage-payment-mutated]
               [::garage-payment-save-error]]}))

(re-frame/reg-event-fx
 ::delete-garage-payment
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:garage-payments :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-garage-payment
               {:id id}
               [::garage-payment-mutated]
               [::garage-payment-save-error]]}))

;; Sequential batch — the API takes one payment at a time.
(re-frame/reg-event-fx
 ::create-garage-payments-batch
 (fn [{:keys [db]} [_ payments]]
   (if (empty? payments)
     {:db       (assoc-in db [:garage-payments :saving?] false)
      :dispatch [::load-all-garage-payments]}
     {:db       (assoc-in db [:garage-payments :saving?] true)
      :dispatch [:app.core-ui.events/command
                 :create-garage-payment
                 (first payments)
                 [::garage-payments-batch-continue (vec (rest payments))]
                 [::garage-payment-save-error]]})))

(re-frame/reg-event-fx
 ::garage-payments-batch-continue
 (fn [_ [_ remaining _response]]
   {:dispatch [::create-garage-payments-batch remaining]}))

(re-frame/reg-event-fx
 ::garage-payment-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:garage-payments :saving?] false)
    :dispatch [::load-all-garage-payments]}))

(re-frame/reg-event-db
 ::garage-payment-save-error
 (fn [db _]
   (assoc-in db [:garage-payments :saving?] false)))

;; ── Tenant Mieten ─────────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-all-tenant-mieten
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tenant-mieten :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :tenant-miete}
               [::tenant-mieten-loaded]
               [::tenant-mieten-error]]}))

(re-frame/reg-event-db
 ::tenant-mieten-loaded
 (fn [db [_ {:keys [tenant-mieten]}]]
   (-> db
       (assoc-in [:tenant-mieten :list] tenant-mieten)
       (assoc-in [:tenant-mieten :loading?] false))))

(re-frame/reg-event-db
 ::tenant-mieten-error
 (fn [db _]
   (assoc-in db [:tenant-mieten :loading?] false)))

(re-frame/reg-event-fx
 ::upsert-tenant-miete
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:tenant-mieten :saving?] true)
    :dispatch [:app.core-ui.events/command
               :upsert-tenant-miete
               data
               [::tenant-miete-mutated]
               [::tenant-miete-save-error]]}))

(re-frame/reg-event-fx
 ::delete-tenant-miete
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:tenant-mieten :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-tenant-miete
               {:id id}
               [::tenant-miete-mutated]
               [::tenant-miete-save-error]]}))

(re-frame/reg-event-fx
 ::tenant-miete-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:tenant-mieten :saving?] false)
    :dispatch [::load-all-tenant-mieten]}))

(re-frame/reg-event-db
 ::tenant-miete-save-error
 (fn [db _]
   (assoc-in db [:tenant-mieten :saving?] false)))
