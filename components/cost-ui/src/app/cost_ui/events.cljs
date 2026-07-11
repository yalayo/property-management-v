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
   (let [property-id  (get-in db [:costs :property-id])
         apartment-id (get-in db [:apartment-costs :apartment-id])]
     {:db         (assoc-in db [:costs :saving?] false)
      :dispatch-n (cond-> [[::load-costs property-id]
                            [::load-all-costs]
                            [::load-all-apt-costs]]
                    apartment-id (conj [::load-apartment-costs apartment-id]))})))

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
     {:db         (-> db
                      (assoc-in [:apartment-costs :saving?]    false)
                      (assoc-in [:apartment-costs :save-error?] false))
      :dispatch-n [[::load-apartment-costs apartment-id]
                   [::load-all-apt-costs]]})))

(re-frame/reg-event-db
 ::apt-cost-error
 (fn [db [_ error]]
   (js/console.error "Apartment cost save failed:" (clj->js error))
   (-> db
       (assoc-in [:apartment-costs :saving?]    false)
       (assoc-in [:apartment-costs :save-error?] true))))

(re-frame/reg-event-db
 ::clear-apt-cost-error
 (fn [db _]
   (assoc-in db [:apartment-costs :save-error?] false)))

;; ── Org-wide queries (analytics / accounting) ────────────────────────────

(re-frame/reg-event-fx
 ::load-all-costs
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:all-costs :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :cost}
               [::all-costs-loaded]
               [::all-costs-error]]}))

(re-frame/reg-event-db
 ::all-costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:all-costs :list] costs)
       (assoc-in [:all-costs :loading?] false))))

(re-frame/reg-event-db
 ::all-costs-error
 (fn [db _]
   (assoc-in db [:all-costs :loading?] false)))

(re-frame/reg-event-fx
 ::load-all-apt-costs
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:all-apt-costs :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :apartment-cost}
               [::all-apt-costs-loaded]
               [::all-apt-costs-error]]}))

(re-frame/reg-event-db
 ::all-apt-costs-loaded
 (fn [db [_ {:keys [costs]}]]
   (-> db
       (assoc-in [:all-apt-costs :list] costs)
       (assoc-in [:all-apt-costs :loading?] false))))

(re-frame/reg-event-db
 ::all-apt-costs-error
 (fn [db _]
   (assoc-in db [:all-apt-costs :loading?] false)))

(re-frame/reg-event-fx
 ::load-all-rent-payments
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:all-rent-payments :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :rent-payment}
               [::all-rent-payments-loaded]
               [::all-rent-payments-error]]}))

(re-frame/reg-event-db
 ::all-rent-payments-loaded
 (fn [db [_ {:keys [rent-payments]}]]
   (-> db
       (assoc-in [:all-rent-payments :list] rent-payments)
       (assoc-in [:all-rent-payments :loading?] false))))

(re-frame/reg-event-db
 ::all-rent-payments-error
 (fn [db _]
   (assoc-in db [:all-rent-payments :loading?] false)))

;; ── Expense types ─────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-expense-types
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:expense-types :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :expense-type}
               [::expense-types-loaded]
               [::expense-types-error]]}))

(re-frame/reg-event-db
 ::expense-types-loaded
 (fn [db [_ {:keys [expense-types]}]]
   (-> db
       (assoc-in [:expense-types :list] expense-types)
       (assoc-in [:expense-types :loading?] false))))

(re-frame/reg-event-db
 ::expense-types-error
 (fn [db _]
   (assoc-in db [:expense-types :loading?] false)))

(re-frame/reg-event-fx
 ::create-expense-type
 (fn [{:keys [db]} [_ {:keys [key name-en name-de distribution-method]}]]
   {:db       (assoc-in db [:expense-types :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-expense-type
               {:key                 key
                :name-en             name-en
                :name-de             name-de
                :distribution-method distribution-method}
               [::expense-type-mutated]
               [::expense-type-error]]}))

(re-frame/reg-event-fx
 ::update-expense-type
 (fn [{:keys [db]} [_ {:keys [id name-en name-de distribution-method]}]]
   {:db       (assoc-in db [:expense-types :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-expense-type
               {:id                  id
                :name-en             name-en
                :name-de             name-de
                :distribution-method distribution-method}
               [::expense-type-mutated]
               [::expense-type-error]]}))

(re-frame/reg-event-fx
 ::delete-expense-type
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:expense-types :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-expense-type
               {:id id}
               [::expense-type-mutated]
               [::expense-type-error]]}))

(re-frame/reg-event-fx
 ::expense-type-mutated
 (fn [{:keys [db]} _]
   {:db       (-> db
                  (assoc-in [:expense-types :saving?] false)
                  (assoc-in [:expense-types :save-error] false))
    :dispatch [::load-expense-types]}))

(re-frame/reg-event-db
 ::expense-type-error
 (fn [db _]
   (-> db
       (assoc-in [:expense-types :saving?] false)
       (assoc-in [:expense-types :save-error] true))))

;; ── Bank accounts ─────────────────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-bank-accounts
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:bank-accounts :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :bank-account}
               [::bank-accounts-loaded]
               [::bank-accounts-error]]}))

(re-frame/reg-event-db
 ::bank-accounts-loaded
 (fn [db [_ {:keys [bank-accounts]}]]
   (-> db
       (assoc-in [:bank-accounts :list] bank-accounts)
       (assoc-in [:bank-accounts :loading?] false))))

(re-frame/reg-event-db
 ::bank-accounts-error
 (fn [db _]
   (assoc-in db [:bank-accounts :loading?] false)))

(re-frame/reg-event-fx
 ::create-bank-account
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:bank-accounts :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-bank-account
               data
               [::bank-account-mutated]
               [::bank-account-error]]}))

(re-frame/reg-event-fx
 ::update-bank-account
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:bank-accounts :saving?] true)
    :dispatch [:app.core-ui.events/command
               :update-bank-account
               data
               [::bank-account-mutated]
               [::bank-account-error]]}))

(re-frame/reg-event-fx
 ::delete-bank-account
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:bank-accounts :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-bank-account
               {:id id}
               [::bank-account-mutated]
               [::bank-account-error]]}))

(re-frame/reg-event-fx
 ::bank-account-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:bank-accounts :saving?] false)
    :dispatch [::load-bank-accounts]}))

(re-frame/reg-event-db
 ::bank-account-error
 (fn [db _]
   (assoc-in db [:bank-accounts :saving?] false)))

;; ── Nebenkosten settlements ───────────────────────────────────────────────

(re-frame/reg-event-fx
 ::load-nebenkosten-settlements
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:nk-settlements :loading?] true)
    :dispatch [:app.core-ui.events/query
               {:entity :nk-settlement}
               [::nk-settlements-loaded]
               [::nk-settlements-error]]}))

(re-frame/reg-event-db
 ::nk-settlements-loaded
 (fn [db [_ {:keys [nebenkosten-settlements]}]]
   (-> db
       (assoc-in [:nk-settlements :list] (or nebenkosten-settlements []))
       (assoc-in [:nk-settlements :loading?] false))))

(re-frame/reg-event-db
 ::nk-settlements-error
 (fn [db _]
   (assoc-in db [:nk-settlements :loading?] false)))

(re-frame/reg-event-fx
 ::create-nebenkosten-settlement
 (fn [{:keys [db]} [_ data]]
   {:db       (assoc-in db [:nk-settlements :saving?] true)
    :dispatch [:app.core-ui.events/command
               :create-nebenkosten-settlement
               data
               [::nk-settlement-mutated]
               [::nk-settlement-error]]}))

(re-frame/reg-event-fx
 ::delete-nebenkosten-settlement
 (fn [{:keys [db]} [_ id]]
   {:db       (assoc-in db [:nk-settlements :saving?] true)
    :dispatch [:app.core-ui.events/command
               :delete-nebenkosten-settlement
               {:id id}
               [::nk-settlement-mutated]
               [::nk-settlement-error]]}))

(re-frame/reg-event-fx
 ::nk-settlement-mutated
 (fn [{:keys [db]} _]
   {:db       (assoc-in db [:nk-settlements :saving?] false)
    :dispatch [::load-nebenkosten-settlements]}))

(re-frame/reg-event-db
 ::nk-settlement-error
 (fn [db _]
   (assoc-in db [:nk-settlements :saving?] false)))
