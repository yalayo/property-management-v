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
            [app.tax-ui.views    :as tax-ui]
            [app.tax-ui.subs     :as tax-subs]
            [app.tax-ui.events   :as tax-events]
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
            ["/pages/not-found$default"           :as not-found-js]
            ["/components/settings/ExpenseTypes$default"  :as expense-types-js]
            ["/components/admin/AdminPanel$default"       :as admin-panel-js]
            ["/components/team/OrgUserManager$default"   :as org-user-manager-js]))

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
(def expense-types-comp  (r/adapt-react-class expense-types-js))
(def admin-panel         (r/adapt-react-class admin-panel-js))
(def org-user-manager    (r/adapt-react-class org-user-manager-js))

(defn component [{:keys []}]
  (let [active               @(re-frame/subscribe [::subs/active-section])
        current-user         @(re-frame/subscribe [::subs/current-user])
        survey-email         @(re-frame/subscribe [::subs/survey-email])
        properties           @(re-frame/subscribe [::property-subs/properties])
        prop-loading?        @(re-frame/subscribe [::property-subs/loading?])
        prop-saving?         @(re-frame/subscribe [::property-subs/saving?])
        all-apartments       @(re-frame/subscribe [::apartment-subs/apartments])
        all-garages          @(re-frame/subscribe [::apartment-subs/garages])
        apts-loading?        @(re-frame/subscribe [::apartment-subs/loading?])
        apts-saving?         @(re-frame/subscribe [::apartment-subs/saving?])
        selected-apt-id      @(re-frame/subscribe [::apartment-subs/selected-apartment-id])
        tenants              @(re-frame/subscribe [::tenant-subs/tenants])
        tenants-loading?     @(re-frame/subscribe [::tenant-subs/loading?])
        tenants-saving?      @(re-frame/subscribe [::tenant-subs/saving?])
        available-apartments (filter #(not (:apartment/occupied %)) all-apartments)
        costs                @(re-frame/subscribe [::cost-subs/costs])
        costs-loading?       @(re-frame/subscribe [::cost-subs/loading?])
        costs-saving?        @(re-frame/subscribe [::cost-subs/saving?])
        apt-costs            @(re-frame/subscribe [::cost-subs/apartment-costs])
        apt-costs-loading?   @(re-frame/subscribe [::cost-subs/apt-costs-loading?])
        apt-costs-saving?    @(re-frame/subscribe [::cost-subs/apt-costs-saving?])
        apt-cost-save-error? @(re-frame/subscribe [::cost-subs/apt-cost-save-error?])
        rent-payments        @(re-frame/subscribe [::rent-subs/rent-payments])
        rent-loading?        @(re-frame/subscribe [::rent-subs/loading?])
        rent-saving?         @(re-frame/subscribe [::rent-subs/saving?])
        tenant-mieten        @(re-frame/subscribe [::rent-subs/tenant-mieten])
        miete-saving?        @(re-frame/subscribe [::rent-subs/miete-saving?])
        expense-types        @(re-frame/subscribe [::cost-subs/expense-types])
        expense-types-loading? @(re-frame/subscribe [::cost-subs/expense-types-loading?])
        expense-types-saving?  @(re-frame/subscribe [::cost-subs/expense-types-saving?])
        expense-types-error?   @(re-frame/subscribe [::cost-subs/expense-types-save-error?])
        dashboard-tab        @(re-frame/subscribe [::subs/dashboard-tab])
        all-costs            @(re-frame/subscribe [::cost-subs/all-costs])
        all-apt-costs        @(re-frame/subscribe [::cost-subs/all-apt-costs])
        all-rent-payments    @(re-frame/subscribe [::cost-subs/all-rent-payments])
        has-active-plan?     @(re-frame/subscribe [::subs/has-active-plan?])
        is-super-admin?      @(re-frame/subscribe [::subs/is-super-admin?])
        is-impersonating?    @(re-frame/subscribe [::subs/is-impersonating?])
        can-create?          (or has-active-plan? is-super-admin? is-impersonating?)
        admin-users          @(re-frame/subscribe [::subs/admin-users])
        admin-loading?       @(re-frame/subscribe [::subs/admin-loading?])
        admin-exporting?     @(re-frame/subscribe [::subs/admin-exporting?])
        admin-importing?     @(re-frame/subscribe [::subs/admin-importing?])
        survey-questions     @(re-frame/subscribe [::subs/survey-questions])
        survey-q-loading?    @(re-frame/subscribe [::subs/survey-questions-loading?])
        impersonated-email   @(re-frame/subscribe [::subs/impersonated-user-email])
        tax-configs          @(re-frame/subscribe [::tax-subs/tax-configs])
        tax-loans            @(re-frame/subscribe [::tax-subs/loans])
        user-role            @(re-frame/subscribe [::subs/user-role])
        user-sections        @(re-frame/subscribe [::subs/user-sections])
        org-users            @(re-frame/subscribe [::subs/org-users])
        org-users-loading?   @(re-frame/subscribe [::subs/org-users-loading?])
        org-users-saving?    @(re-frame/subscribe [::subs/org-users-saving?])
        trial-info           @(re-frame/subscribe [::subs/trial-info])]
    [:<>
     [main
      {:activeComponent
       (r/as-element
       (case active         
         "onboarding"         [onboarding {}]
         "bank-accounts"      [bank-accounts {:user                  current-user
                                              :onNavigateToDashboard #(re-frame/dispatch [::events/change-active-section "home"])}]
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
                                :onSignIn     (when-not current-user #(re-frame/dispatch [::events/change-active-section "auth"]))
                                :onSignUp     (when-not current-user #(re-frame/dispatch [::events/change-active-section "register"]))
                                :onGoHome     #(re-frame/dispatch [::events/change-active-section "home"])
                                :onSelectPlan (fn [tier-id]
                                                (re-frame/dispatch [::events/change-active-section "payment"])
                                                (payment-ui/select-tier tier-id))}]
         "plans"              [plans-ui/component {:id "plans"}]
         "payment"            [payment-ui/component {}]
         [dashboard
          {:onLogout           #(re-frame/dispatch [::events/sign-out])
           :isReadOnly         (not can-create?)
           :onUpgrade          #(re-frame/dispatch [::events/change-active-section "features-pricing"])
           :activeTab          dashboard-tab
           :onChangeTab        #(re-frame/dispatch [::events/set-dashboard-tab %])
           :userKey            (:email current-user)
           :onLoadData         (fn []
                                 (property-ui/load-properties)
                                 (re-frame/dispatch [::apartment-events/load-apartments])
                                 (re-frame/dispatch [::tenant-events/load-tenants])
                                 (re-frame/dispatch [::cost-events/load-expense-types])
                                 (re-frame/dispatch [::cost-events/load-all-costs])
                                 (re-frame/dispatch [::cost-events/load-all-apt-costs])
                                 (re-frame/dispatch [::cost-events/load-all-rent-payments])
                                 (re-frame/dispatch [::rent-events/load-all-tenant-mieten])
                                 (re-frame/dispatch [::apartment-events/load-garages])
                                 (re-frame/dispatch [::tax-events/load-tax-data])
                                 (when-let [tier (js/localStorage.getItem "pm-pending-plan")]
                                   (js/localStorage.removeItem "pm-pending-plan")
                                   (re-frame/dispatch [::events/change-active-section "payment"])
                                   (payment-ui/select-tier tier)))
           :garages            (clj->js all-garages)
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
                                               :is-read-only?      (not can-create?)
                                               :tenants            tenants
                                               :expense-types      expense-types
                                               :all-costs          all-costs
                                               :on-after-assign    (fn [] (tenant-ui/load-tenants))
                                               :on-update-tenant   (fn [id data]
                                                                     (let [d (js->clj data :keywordize-keys true)]
                                                                       (re-frame/dispatch
                                                                        [::tenant-events/update-tenant id
                                                                         {:first-name        (:firstName d)
                                                                          :last-name         (:lastName d)
                                                                          :email             (:email d)
                                                                          :phone             (:phone d)
                                                                          :start-date        (:startDate d)
                                                                          :end-date          (:endDate d)
                                                                          :birthday          (:birthday d)
                                                                          :household-members (:householdMembers d)
                        :kaltmiete         (:kaltmiete d)
                        :nebenkosten-warm  (:nebenkostenWarm d)}])))
                                               :tenants-saving?    tenants-saving?
                                               :apt-costs          (clj->js apt-costs)
                                               :apt-costs-loading?    apt-costs-loading?
                                               :apt-costs-saving?     apt-costs-saving?
                                               :apt-cost-save-error?  apt-cost-save-error?
                                               :on-clear-apt-cost-error (fn [] (re-frame/dispatch [::cost-events/clear-apt-cost-error]))
                                               :on-load-apt-costs  (fn [apt-id]
                                                                     (re-frame/dispatch [::cost-events/load-apartment-costs apt-id]))
                                               :on-add-apt-cost    (fn [data]
                                                                     (let [d (js->clj data :keywordize-keys true)]
                                                                       (re-frame/dispatch
                                                                        [::cost-events/create-apartment-cost
                                                                         {:apartment-id (:apartmentId d)
                                                                          :line         (:line d)
                                                                          :name         (:name d)
                                                                          :year         (:year d)
                                                                          :value        (:value d)
                                                                          :verteiler    (:verteiler d)
                                                                          :anteil       (:anteil d)
                                                                          :schluessel   (:schluessel d)}])))
                                               :on-update-apt-cost (fn [data]
                                                                     (let [d (js->clj data :keywordize-keys true)]
                                                                       (re-frame/dispatch
                                                                        [::cost-events/update-apartment-cost
                                                                         {:id          (:id d)
                                                                          :value       (:value d)
                                                                          :verteiler   (:verteiler d)
                                                                          :anteil      (:anteil d)
                                                                          :schluessel  (:schluessel d)}])))
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
                                                                                  (cond-> {:apartment-id (:apartmentId d)
                                                                                           :year         (:year d)
                                                                                           :month        (:month d)
                                                                                           :value        (:value d)}
                                                                                    (some? (:kaltmiete d))        (assoc :kaltmiete (:kaltmiete d))
                                                                                    (some? (:nebenkostenWarm d))  (assoc :nebenkosten-warm (:nebenkostenWarm d)))])))
                                               :on-update-rent-payment      (fn [data]
                                                                              (let [d (js->clj data :keywordize-keys true)]
                                                                                (re-frame/dispatch
                                                                                 [::rent-events/update-rent-payment
                                                                                  (cond-> {:id    (:id d)
                                                                                           :value (:value d)}
                                                                                    (some? (:kaltmiete d))        (assoc :kaltmiete (:kaltmiete d))
                                                                                    (some? (:nebenkostenWarm d))  (assoc :nebenkosten-warm (:nebenkostenWarm d)))])))
                                               :on-delete-rent-payment      (fn [id]
                                                                              (re-frame/dispatch [::rent-events/delete-rent-payment id]))
                                               :tenant-mieten               (clj->js tenant-mieten)
                                               :miete-saving?               miete-saving?
                                               :on-upsert-tenant-miete      (fn [data]
                                                                              (let [d (js->clj data :keywordize-keys true)]
                                                                                (re-frame/dispatch
                                                                                 [::rent-events/upsert-tenant-miete
                                                                                  {:tenant-id       (:tenantId d)
                                                                                   :year            (:year d)
                                                                                   :kaltmiete       (:kaltmiete d)
                                                                                   :nebenkosten-warm (:nebenkostenWarm d)}])))
                                               :on-delete-tenant-miete      (fn [id]
                                                                              (re-frame/dispatch [::rent-events/delete-tenant-miete id]))
                                               :on-update-apartment         (fn [id data]
                                                                              (let [d (js->clj data :keywordize-keys true)]
                                                                                (re-frame/dispatch
                                                                                 [::apartment-events/update-apartment id
                                                                                  (cond-> {}
                                                                                    (:code d)        (assoc :code (:code d))
                                                                                    (:wohnflaeche d) (assoc :wohnflaeche (:wohnflaeche d))
                                                                                    (some? (:marketRent d)) (assoc :market-rent (:marketRent d))
                                                                                    (some? (:stromZaehlerNr d))   (assoc :strom-zaehler-nr (:stromZaehlerNr d))
                                                                                    (some? (:wasserZaehlerNrn d)) (assoc :wasser-zaehler-nrn (:wasserZaehlerNrn d)))])))
                                               :on-load-costs               (fn [property-id]
                                                                              (re-frame/dispatch [::cost-events/load-costs property-id]))
                                               :on-edit-property            (when can-create?
                                                                              (fn [id data]
                                                                                (let [d (js->clj data :keywordize-keys true)]
                                                                                  (re-frame/dispatch
                                                                                   [::property-events/update-property id
                                                                                    {:name                 (:name d)
                                                                                     :address              (:address d)
                                                                                     :city                 (:city d)
                                                                                     :postal-code          (:postalCode d)
                                                                                     :units                (:units d)
                                                                                     :iban                 (:iban d)
                                                                                     :bank-name            (:bankName d)
                                                                                     :landlord-name        (:landlordName d)
                                                                                     :landlord-street      (:landlordStreet d)
                                                                                     :landlord-postal-city (:landlordPostalCity d)}]))))
                                               :prop-saving?                prop-saving?}])
           :rentSaving         rent-saving?
           :onAssignPayment    (when can-create?
                                 (fn [data]
                                   (let [d (js->clj data :keywordize-keys true)]
                                     (re-frame/dispatch
                                      [::rent-events/create-rent-payment
                                       {:apartment-id  (:apartmentId d)
                                        :year          (:year d)
                                        :month         (:month d)
                                        :value         (:value d)
                                        :date          (:date d)
                                        :description   (:description d)
                                        :payment-type  (:type d)
                                        :source-file   (:sourceFile d)
                                        :recorded-at   (:recordedAt d)}]))))
           :onRecordExpense    (when can-create?
                                 (fn [data]
                                   (let [d (js->clj data :keywordize-keys true)]
                                     (re-frame/dispatch
                                      [::cost-events/create-cost
                                       {:property-id (:propertyId d)
                                        :line        (or (not-empty (:expenseLine d)) "sonstige")
                                        :name        (:description d)
                                        :year        (:year d)
                                        :value       (:value d)
                                        :source-file (:sourceFile d)
                                        :recorded-at (:recordedAt d)}]))))
           :tenantsView        (r/as-element [tenant-ui/component {:apartments    available-apartments
                                                                               :is-read-only? (not can-create?)}])
           :taxView            (r/as-element [tax-ui/component
                                              {:properties       properties
                                               :apartments       all-apartments
                                               :garages          all-garages
                                               :all-rent-payments all-rent-payments
                                               :all-costs        all-costs
                                               :is-read-only?    (not can-create?)}])
           :expensesView       (r/as-element [expense-types-comp
                                              {:expenseTypes (clj->js expense-types)
                                               :isReadOnly   (not can-create?)
                                               :isLoading    expense-types-loading?
                                               :isSaving     expense-types-saving?
                                               :saveError    expense-types-error?
                                               :onLoad       #(re-frame/dispatch [::cost-events/load-expense-types])
                                               :onAdd        (fn [data]
                                                               (let [d (js->clj data :keywordize-keys true)]
                                                                 (re-frame/dispatch [::cost-events/create-expense-type
                                                                                    {:key                 (:key d)
                                                                                     :name-en             (:nameEn d)
                                                                                     :name-de             (:nameDe d)
                                                                                     :distribution-method (:distributionMethod d)}])))
                                               :onUpdate     (fn [id name-en name-de distribution-method]
                                                               (re-frame/dispatch [::cost-events/update-expense-type
                                                                                  {:id                  id
                                                                                   :name-en             name-en
                                                                                   :name-de             name-de
                                                                                   :distribution-method distribution-method}]))
                                               :onDelete     (fn [id]
                                                               (re-frame/dispatch [::cost-events/delete-expense-type id]))}])
           :onImportDemoData    (when can-create?
                                  (fn [guest-data]
                                    (let [d         (js->clj guest-data :keywordize-keys true)
                                          props-list (:properties d [])
                                          et-list    (:expenseTypes d [])]
                                      (doseq [p props-list]
                                        (re-frame/dispatch
                                         [::property-events/add-property
                                          {:name        (:name p)
                                           :address     (:address p)
                                           :city        (:city p)
                                           :postal-code (:postalCode p)
                                           :units       (:units p)}]))
                                      (doseq [et et-list]
                                        (re-frame/dispatch
                                         [::cost-events/create-expense-type
                                          {:key     (:key et)
                                           :name-en (:name-en et)
                                           :name-de (:name-de et)}])))))
           :onAddProperty      (when can-create?
                                 (fn [data]
                                   (let [d (js->clj data :keywordize-keys true)]
                                     (re-frame/dispatch
                                      [::property-events/add-property
                                       {:name             (:name d)
                                        :address          (:address d)
                                        :city             (:city d)
                                        :postal-code      (:postalCode d)
                                        :units            (:units d)
                                        :acquisition-date (:acquisitionDate d)
                                        :purchase-price   (:purchasePrice d)
                                        :current-value    (:currentValue d)
                                        :land-value       (:landValue d)
                                        :building-value   (:buildingValue d)
                                        :ownership-share  (:ownershipShare d)
                                        :living-area-m2   (:livingAreaM2 d)
                                        :rental-area-m2   (:rentalAreaM2 d)
                                        :year-built       (:yearBuilt d)
                                        :usage            (:usage d)}]))))
           :onEditProperty     (when can-create?
                                 (fn [id data]
                                   (let [d (js->clj data :keywordize-keys true)]
                                     (re-frame/dispatch
                                      [::property-events/update-property id
                                       {:name             (:name d)
                                        :address          (:address d)
                                        :city             (:city d)
                                        :postal-code      (:postalCode d)
                                        :units            (:units d)
                                        :acquisition-date (:acquisitionDate d)
                                        :purchase-price   (:purchasePrice d)
                                        :current-value    (:currentValue d)
                                        :iban                 (:iban d)
                                        :bank-name            (:bankName d)
                                        :landlord-name        (:landlordName d)
                                        :landlord-street      (:landlordStreet d)
                                        :landlord-postal-city (:landlordPostalCity d)
                                        :land-value       (:landValue d)
                                        :building-value   (:buildingValue d)
                                        :ownership-share  (:ownershipShare d)
                                        :living-area-m2   (:livingAreaM2 d)
                                        :rental-area-m2   (:rentalAreaM2 d)
                                        :year-built       (:yearBuilt d)
                                        :usage            (:usage d)}]))))
           :onDeleteProperty   (when can-create?
                                 (fn [id]
                                   (re-frame/dispatch [::property-events/delete-property id])))
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
           :aptsSaving              apts-saving?
           :tenantsSaving           tenants-saving?
           :selectedApartmentId     selected-apt-id
           :onSelectApartmentInline (fn [apt-id initial-tab]
                                      (re-frame/dispatch [::apartment-events/select-apartment apt-id initial-tab]))
           :onClearSelectedApartment #(re-frame/dispatch [::apartment-events/clear-selected-apartment])
           :onAddApartment     (when can-create?
                                 (fn [property-id js-data]
                                   (let [d (js->clj js-data :keywordize-keys true)]
                                     (re-frame/dispatch [::apartment-events/set-new-property-id property-id])
                                     (re-frame/dispatch [::apartment-events/set-new-code (:code d)])
                                     (re-frame/dispatch [::apartment-events/set-new-wohnflaeche
                                                         (when (seq (:wohnflaeche d))
                                                           (js/parseFloat (:wohnflaeche d)))])
                                     (re-frame/dispatch [::apartment-events/set-new-strom-zaehler-nr
                                                         (not-empty (:stromZaehlerNr d))])
                                     (re-frame/dispatch [::apartment-events/set-new-wasser-zaehler-nrn
                                                         (or (:wasserZaehlerNrn d) [])])
                                     (re-frame/dispatch [::apartment-events/add-apartment]))))
           :onAddTenant        (when can-create?
                                 (fn [data]
                                   (let [d (js->clj data :keywordize-keys true)]
                                     (re-frame/dispatch [::tenant-events/add-tenant
                                                         {:first-name   (:firstName d)
                                                          :last-name    (:lastName d)
                                                          :email        (:email d)
                                                          :phone        (:phone d)
                                                          :start-date   (:startDate d)
                                                          :end-date     (:endDate d)
                                                          :apartment-id (when-not (empty? (:apartmentId d))
                                                                          (:apartmentId d))}]))))
           :onAddGarage         (when can-create?
                                  (fn [property-id js-data]
                                    (let [d (js->clj js-data :keywordize-keys true)]
                                      (re-frame/dispatch [::apartment-events/set-new-garage-property-id property-id])
                                      (re-frame/dispatch [::apartment-events/set-new-garage-code (:code d)])
                                      (when (seq (:flaeche d))
                                        (re-frame/dispatch [::apartment-events/set-new-garage-flaeche
                                                            (js/parseFloat (:flaeche d))]))
                                      (when (seq (:monthlyRent d))
                                        (re-frame/dispatch [::apartment-events/set-new-garage-monthly-rent
                                                            (js/parseFloat (:monthlyRent d))]))
                                      (when (seq (:tenantId d))
                                        (re-frame/dispatch [::apartment-events/set-new-garage-tenant-id (:tenantId d)]))
                                      (re-frame/dispatch [::apartment-events/add-garage]))))
           :onSelectGarageInline (fn [garage-id]
                                   (re-frame/dispatch [::apartment-events/select-garage garage-id]))
           :onNavigateToApartment (fn [apt-id initial-tab]
                                    (re-frame/dispatch [::apartment-events/select-apartment apt-id initial-tab])
                                    (re-frame/dispatch [::events/set-dashboard-tab "apartments"]))
           :onNavigateToTenant (fn [tenant-id]
                                 (re-frame/dispatch [::tenant-events/select-tenant tenant-id])
                                 (re-frame/dispatch [::events/set-dashboard-tab "tenants"]))
           :onViewApartments   (fn [property]
                                 (re-frame/dispatch [::events/navigate-to-apartments (js->clj property :keywordize-keys true)]))
           :costs              (clj->js costs)
           :expenseTypes       (clj->js expense-types)
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
                                 (re-frame/dispatch [::cost-events/delete-cost id]))
           :allCosts           (clj->js all-costs)
           :allAptCosts        (clj->js all-apt-costs)
           :allRentPayments    (clj->js all-rent-payments)
           :taxConfigs         (clj->js tax-configs)
           :taxLoans           (clj->js tax-loans)
           :userRole            user-role
           :userSections        user-sections
           :teamView            (when (= "admin" user-role)
                                  (r/as-element
                                   [org-user-manager
                                    {:users            (clj->js org-users)
                                     :isLoading        org-users-loading?
                                     :isSaving         org-users-saving?
                                     :currentUserEmail (:email current-user)
                                     :onLoad           #(re-frame/dispatch [::events/load-org-users])
                                     :onCreateUser     (fn [data]
                                                         (let [d (js->clj data :keywordize-keys true)]
                                                           (re-frame/dispatch
                                                            [::events/create-org-user
                                                             {:email    (:email d)
                                                              :name     (:name d)
                                                              :password (:password d)
                                                              :sections (:sections d)}])))
                                     :onUpdateSections (fn [membership-id sections]
                                                         (re-frame/dispatch
                                                          [::events/update-org-user-sections
                                                           membership-id
                                                           (js->clj sections)]))
                                     :onDeleteUser     (fn [account-id membership-id]
                                                         (re-frame/dispatch
                                                          [::events/delete-org-user account-id membership-id]))}]))
           :isSuperAdmin        is-super-admin?
           :isImpersonating     is-impersonating?
           :impersonatedEmail   impersonated-email
           :onExitImpersonation #(re-frame/dispatch [::events/exit-impersonation])
           :trialInfo           (when-not is-super-admin? (clj->js trial-info))
           :onPauseTrial        (when-not is-super-admin? #(re-frame/dispatch [::events/pause-trial]))
           :onResumeTrial       (when-not is-super-admin? #(re-frame/dispatch [::events/resume-trial]))
           :adminPanel          (when (and is-super-admin? (not is-impersonating?))
                                 (r/as-element
                                  [admin-panel
                                   {:users            (clj->js admin-users)
                                    :isLoading        admin-loading?
                                    :onLoad           #(re-frame/dispatch [::events/load-admin-users])
                                    :onSetPlan        (fn [email tier]
                                                        (re-frame/dispatch [::events/admin-set-plan email tier]))
                                    :onImpersonate    (fn [email]
                                                        (re-frame/dispatch [::events/admin-impersonate-user email]))
                                    :questions        (clj->js survey-questions)
                                    :questionsLoading survey-q-loading?
                                    :onLoadQuestions  #(re-frame/dispatch [::events/load-survey-questions])
                                    :onAddQuestion    (fn [text order]
                                                        (re-frame/dispatch [::events/admin-create-question text order]))
                                    :onUpdateQuestion (fn [id text]
                                                        (re-frame/dispatch [::events/admin-update-question id text]))
                                    :onDeleteQuestion (fn [id]
                                                        (re-frame/dispatch [::events/admin-delete-question id]))
                                    :onExportData     (fn [email]
                                                        (re-frame/dispatch [::events/admin-export-data email]))
                                    :onImportEdn      (fn [raw-edn]
                                                        (re-frame/dispatch [::events/admin-import-raw-edn raw-edn]))
                                    :isExporting      admin-exporting?
                                    :isImporting      admin-importing?
                                    :onPauseUserTrial  (fn [email]
                                                         (re-frame/dispatch [::events/admin-pause-trial email]))
                                    :onResumeUserTrial (fn [email]
                                                         (re-frame/dispatch [::events/admin-resume-trial email]))}]))}]))}]]))
