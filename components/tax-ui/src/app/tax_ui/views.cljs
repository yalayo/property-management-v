(ns app.tax-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.tax-ui.subs :as subs]
            [app.tax-ui.events :as events]
            ["/components/tax/AnlageV$default" :as anlage-v-js]))

(def anlage-v (r/adapt-react-class anlage-v-js))

(defn component [_]
  (re-frame/dispatch [::events/load-tax-data])
  (fn [{:keys [properties apartments garages all-rent-payments all-costs is-read-only?]}]
    (let [loading?     @(re-frame/subscribe [::subs/loading?])
          saving?      @(re-frame/subscribe [::subs/saving?])
          configs      @(re-frame/subscribe [::subs/tax-configs])
          loans        @(re-frame/subscribe [::subs/loans])
          maintenances @(re-frame/subscribe [::subs/maintenances])]
      [anlage-v
       {:properties      (clj->js (or properties []))
        :apartments      (clj->js (or apartments []))
        :garages         (clj->js (or garages []))
        :allRentPayments (clj->js (or all-rent-payments []))
        :allCosts        (clj->js (or all-costs []))
        :taxConfigs      (clj->js configs)
        :loans           (clj->js loans)
        :maintenances    (clj->js maintenances)
        :isReadOnly      is-read-only?
        :isLoading       loading?
        :isSaving        saving?
        :onSaveTaxConfig (fn [data]
                           (let [d (js->clj data :keywordize-keys true)]
                             (re-frame/dispatch [::events/save-tax-config
                                                 {:property-id    (:propertyId d)
                                                  :land-value     (:landValue d)
                                                  :building-value (:buildingValue d)
                                                  :afa-rate       (:afaRate d)
                                                  :afa-start-date (:afaStartDate d)}])))
        :onAddLoan       (fn [data]
                           (let [d (js->clj data :keywordize-keys true)]
                             (re-frame/dispatch [::events/create-loan
                                                 {:property-id     (:propertyId d)
                                                  :year            (:year d)
                                                  :lender-name     (:lenderName d)
                                                  :annual-interest (:annualInterest d)
                                                  :notes           (:notes d)}])))
        :onUpdateLoan    (fn [data]
                           (let [d (js->clj data :keywordize-keys true)]
                             (re-frame/dispatch [::events/update-loan
                                                 {:id              (:id d)
                                                  :year            (:year d)
                                                  :lender-name     (:lenderName d)
                                                  :annual-interest (:annualInterest d)
                                                  :notes           (:notes d)}])))
        :onDeleteLoan    (fn [id]
                           (re-frame/dispatch [::events/delete-loan id]))
        :onAddMaintenance    (fn [data]
                               (let [d (js->clj data :keywordize-keys true)]
                                 (re-frame/dispatch [::events/create-maintenance
                                                     {:property-id  (:propertyId d)
                                                      :year         (:year d)
                                                      :description  (:description d)
                                                      :amount       (:amount d)
                                                      :spread-years (:spreadYears d)}])))
        :onUpdateMaintenance (fn [data]
                               (let [d (js->clj data :keywordize-keys true)]
                                 (re-frame/dispatch [::events/update-maintenance
                                                     {:id           (:id d)
                                                      :year         (:year d)
                                                      :description  (:description d)
                                                      :amount       (:amount d)
                                                      :spread-years (:spreadYears d)}])))
        :onDeleteMaintenance (fn [id]
                               (re-frame/dispatch [::events/delete-maintenance id]))}])))
