(ns app.main-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.main-ui.subs   :as subs]
            [app.main-ui.events :as events]
            [app.main-ui.analytics :as analytics]
            [app.auth-ui.views      :as auth]
            [app.register-ui.interface :as register]
            [app.plans-ui.interface :as plans-ui]
            [app.property-ui.interface :as property-ui]
            [app.property-ui.subs :as property-subs]
            [app.property-ui.events :as property-events]
            [app.apartment-ui.interface :as apartment-ui]
            [app.apartment-ui.subs     :as apartment-subs]
            [app.apartment-ui.events   :as apartment-events]
            [app.tenant-ui.interface   :as tenant-ui]
            [app.tenant-ui.subs        :as tenant-subs]
            [app.tenant-ui.events      :as tenant-events]
            [app.payment-ui.interface  :as payment-ui]
            [app.cost-ui.subs         :as cost-subs]
            [app.cost-ui.events       :as cost-events]
            [app.rent-ui.subs         :as rent-subs]
            [app.rent-ui.events       :as rent-events]
            [app.letter.billing       :as billing]
            [app.survey-ui.views :as survey]
            ;; React page imports (thin wrappers — no separate Polylith component needed)
            ["/pages/main$default"                :as main-js]
            ["/pages/home$default"                :as home-js]
            ["/pages/dashboard$default"           :as dashboard-js]
            ["/pages/onboarding$default"          :as onboarding-js]
            ["/pages/bank-accounts$default"       :as bank-accounts-js]
            ["/pages/change-password$default"     :as change-password-js]
            ["/pages/subscription-tiers$default"  :as subscription-tiers-js]
            ["/pages/waiting-list$default"        :as waiting-list-js]
            ["/pages/features-pricing$default"    :as features-pricing-js]
            ["/pages/not-found$default"           :as not-found-js]))

(def main              (r/adapt-react-class main-js))
(def home              (r/adapt-react-class home-js))
(def dashboard         (r/adapt-react-class dashboard-js))
(def onboarding        (r/adapt-react-class onboarding-js))
(def bank-accounts     (r/adapt-react-class bank-accounts-js))
(def change-password   (r/adapt-react-class change-password-js))
(def subscription-tiers (r/adapt-react-class subscription-tiers-js))
(def waiting-list      (r/adapt-react-class waiting-list-js))
(def features-pricing  (r/adapt-react-class features-pricing-js))
(def not-found         (r/adapt-react-class not-found-js))

(defn component [{:keys []}]
  (let [active               @(re-frame/subscribe [::subs/active-section])
        current-user         @(re-frame/subscribe [::subs/current-user])
        survey-email         @(re-frame/subscribe [::subs/survey-email])
        properties           @(re-frame/subscribe [::property-subs/properties])
        prop-loading?        @(re-frame/subscribe [::property-subs/loading?])
        prop-saving?         @(re-frame/subscribe [::property-subs/saving?])
        all-apartments       @(re-frame/subscribe [::apartment-subs/apartments])
        apts-loading?        @(re-frame/subscribe [::apartment-subs/loading?])
        tenants              @(re-frame/subscribe [::tenant-subs/tenants])
        tenants-loading?     @(re-frame/subscribe [::tenant-subs/loading?])
        available-apartments (filter #(not (:apartment/occupied %)) all-apartments)
        costs                @(re-frame/subscribe [::cost-subs/costs])
        costs-loading?       @(re-frame/subscribe [::cost-subs/loading?])
        costs-saving?        @(re-frame/subscribe [::cost-subs/saving?])
        apt-costs            @(re-frame/subscribe [::cost-subs/apartment-costs])
        apt-costs-loading?   @(re-frame/subscribe [::cost-subs/apt-costs-loading?])
        apt-costs-saving?    @(re-frame/subscribe [::cost-subs/apt-costs-saving?])
        rent-payments        @(re-frame/subscribe [::rent-subs/rent-payments])
        rent-loading?        @(re-frame/subscribe [::rent-subs/loading?])
        rent-saving?         @(re-frame/subscribe [::rent-subs/saving?])]
    [main
     {:activeComponent
      (r/as-element
       (case active         
         "onboarding"         [onboarding {}]
         "bank-accounts"      [bank-accounts {:user current-user}]
         "change-password"    [change-password {:user current-user}]
         "subscription-tiers" [subscription-tiers {}]
         "waiting-list"       [waiting-list
                               {:email         survey-email
                                :onViewPricing #(re-frame/dispatch [::events/change-active-section "features-pricing"])
                                :onGoHome      #(re-frame/dispatch [::events/change-active-section "home"])
                                :onSelectPlan  (fn [tier-id]
                                                 (re-frame/dispatch [::events/change-active-section "payment"])
                                                 (payment-ui/select-tier tier-id))}]
         "features-pricing"   [features-pricing
                               {:email        survey-email
                                :onSignIn     #(re-frame/dispatch [::events/change-active-section "auth"])
                                :onSignUp     #(re-frame/dispatch [::events/change-active-section "register"])
                                :onGoHome     #(re-frame/dispatch [::events/change-active-section "home"])
                                :onSelectPlan (fn [tier-id]
                                                (re-frame/dispatch [::events/change-active-section "payment"])
                                                (payment-ui/select-tier tier-id))}]
         "plans"              [plans-ui/component {:id "plans"}]
         "payment"            [payment-ui/component {}]
         [dashboard
          {:onLogout           #(re-frame/dispatch [::events/sign-out])
           :onLoadData         (fn []
                                 (property-ui/load-properties)
                                 (re-frame/dispatch [::apartment-events/load-apartments])
                                 (re-frame/dispatch [::tenant-events/load-tenants]))
           :properties         (clj->js properties)
           :propertiesLoading  prop-loading?
           :apartmentsLoading  apts-loading?
           :isSaving           prop-saving?
           :tenants            (clj->js tenants)
           :tenantsLoading     tenants-loading?
           :apartments         (clj->js all-apartments)
           :latePayments       (clj->js [])
           :paymentsLoading    false
           :apartmentsView     (r/as-element [apartment-ui/component
                                              {:properties         properties
                                               :tenants            tenants
                                               :on-after-assign    (fn [] (tenant-ui/load-tenants))
                                               :apt-costs          (clj->js apt-costs)
                                               :apt-costs-loading? apt-costs-loading?
                                               :apt-costs-saving?  apt-costs-saving?
                                               :on-load-apt-costs  (fn [apt-id]
                                                                     (re-frame/dispatch [::cost-events/load-apartment-costs apt-id]))
                                               :on-add-apt-cost    (fn [data]
                                                                     (let [d (js->clj data :keywordize-keys true)]
                                                                       (re-frame/dispatch
                                                                        [::cost-events/create-apartment-cost
                                                                         {:apartment-id (:apartmentId d)
                                                                          :line        (:line d)
                                                                          :name        (:name d)
                                                                          :year        (:year d)
                                                                          :value       (:value d)}])))
                                               :on-update-apt-cost (fn [data]
                                                                     (let [d (js->clj data :keywordize-keys true)]
                                                                       (re-frame/dispatch
                                                                        [::cost-events/update-apartment-cost
                                                                         {:id    (:id d)
                                                                          :value (:value d)}])))
                                               :on-delete-apt-cost          (fn [id]
                                                                              (re-frame/dispatch [::cost-events/delete-apartment-cost id]))
                                               :rent-payments               (clj->js rent-payments)
                                               :rent-loading?               rent-loading?
                                               :rent-saving?                rent-saving?
                                               :on-load-rent-payments       (fn [apt-id]
                                                                              (re-frame/dispatch [::rent-events/load-rent-payments apt-id]))
                                               :on-add-rent-payment         (fn [data]
                                                                              (let [d (js->clj data :keywordize-keys true)]
                                                                                (re-frame/dispatch
                                                                                 [::rent-events/create-rent-payment
                                                                                  {:apartment-id (:apartmentId d)
                                                                                   :year         (:year d)
                                                                                   :month        (:month d)
                                                                                   :value        (:value d)}])))
                                               :on-update-rent-payment      (fn [data]
                                                                              (let [d (js->clj data :keywordize-keys true)]
                                                                                (re-frame/dispatch
                                                                                 [::rent-events/update-rent-payment
                                                                                  {:id    (:id d)
                                                                                   :value (:value d)}])))
                                               :on-delete-rent-payment      (fn [id]
                                                                              (re-frame/dispatch [::rent-events/delete-rent-payment id]))}])
           :rentSaving         rent-saving?
           :onAssignPayment    (fn [data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (re-frame/dispatch
                                    [::rent-events/create-rent-payment
                                     {:apartment-id (:apartmentId d)
                                      :year         (:year d)
                                      :month        (:month d)
                                      :value        (:value d)
                                      :date         (:date d)
                                      :description  (:description d)}])))
           :tenantsView        (r/as-element [tenant-ui/component {:apartments available-apartments}])
           :onAddProperty      (fn [data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (re-frame/dispatch
                                    [::property-events/add-property
                                     {:name           (:name d)
                                      :address        (:address d)
                                      :city           (:city d)
                                      :postal-code    (:postalCode d)
                                      :units          (:units d)
                                      :purchase-price (:purchasePrice d)
                                      :current-value  (:currentValue d)}])))
           :onEditProperty     (fn [id data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (re-frame/dispatch
                                    [::property-events/update-property id
                                     {:name           (:name d)
                                      :address        (:address d)
                                      :city           (:city d)
                                      :postal-code    (:postalCode d)
                                      :units          (:units d)
                                      :purchase-price (:purchasePrice d)
                                      :current-value  (:currentValue d)
                                      :iban           (:iban d)
                                      :bank-name      (:bankName d)}])))
           :onDeleteProperty   (fn [id]
                                 (re-frame/dispatch [::property-events/delete-property id]))
           :aptCosts           (clj->js apt-costs)
           :aptCostsLoading    apt-costs-loading?
           :rentPayments       (clj->js rent-payments)
           :rentLoading        rent-loading?
           :onLoadAptCosts     (fn [apt-id]
                                 (re-frame/dispatch [::cost-events/load-apartment-costs apt-id]))
           :onLoadRentPayments (fn [apt-id]
                                 (re-frame/dispatch [::rent-events/load-rent-payments apt-id]))
           :computeReadiness   (fn [data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (when-let [r (billing/check-readiness
                                                 {:has-tenant?    (:hasTenant d)
                                                  :has-all-costs? (:hasAllCosts d)
                                                  :has-payments?  (:hasPayments d)
                                                  :has-iban?      (:hasIban d)})]
                                     (clj->js {:ready   (:ready? r)
                                               :missing (vec (:missing r))}))))
           :onViewApartments   (fn [property]
                                 (re-frame/dispatch [::events/navigate-to-apartments (js->clj property :keywordize-keys true)]))
           :costs              (clj->js costs)
           :costsLoading       costs-loading?
           :costsSaving        costs-saving?
           :onLoadCosts        (fn [property-id]
                                 (re-frame/dispatch [::cost-events/load-costs property-id]))
           :onAddCost          (fn [data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (re-frame/dispatch
                                    [::cost-events/create-cost
                                     {:property-id (:propertyId d)
                                      :line        (:line d)
                                      :name        (:name d)
                                      :year        (:year d)
                                      :value       (:value d)}])))
           :onUpdateCost       (fn [data]
                                 (let [d (js->clj data :keywordize-keys true)]
                                   (re-frame/dispatch
                                    [::cost-events/update-cost
                                     {:id    (:id d)
                                      :value (:value d)}])))
           :onDeleteCost       (fn [id]
                                 (re-frame/dispatch [::cost-events/delete-cost id]))}]))}]))
