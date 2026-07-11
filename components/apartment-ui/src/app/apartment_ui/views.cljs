(ns app.apartment-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.apartment-ui.subs :as subs]
            [app.apartment-ui.events :as events]
            ["/components/apartments/ApartmentsList$default" :as apartments-list-js]
            ["/components/apartments/AddApartment$default"   :as add-apartment-js]
            ["/components/apartments/ApartmentView$default"  :as apartment-view-js]
            ["/components/apartments/AssignTenant$default"   :as assign-tenant-js]
            ["/components/apartments/GarageView$default"     :as garage-view-js]
            ["/components/apartments/AddGarage$default"      :as add-garage-js]))

(def apartments-list (r/adapt-react-class apartments-list-js))
(def add-apartment   (r/adapt-react-class add-apartment-js))
(def apartment-view  (r/adapt-react-class apartment-view-js))
(def assign-tenant   (r/adapt-react-class assign-tenant-js))
(def garage-view     (r/adapt-react-class garage-view-js))
(def add-garage      (r/adapt-react-class add-garage-js))

(defn component [_]
  (re-frame/dispatch [::events/load-apartments])
  (re-frame/dispatch [::events/load-garages])
  (re-frame/dispatch [::events/close-assign-dialog])
  (fn [{:keys [properties tenants expense-types all-costs on-after-assign on-update-tenant tenants-saving?
               apt-costs apt-costs-loading? apt-costs-saving? apt-cost-save-error?
               on-load-apt-costs on-add-apt-cost on-update-apt-cost on-delete-apt-cost
               rent-payments rent-loading? rent-saving?
               on-load-rent-payments on-add-rent-payment on-update-rent-payment on-delete-rent-payment
               tenant-mieten miete-saving? on-upsert-tenant-miete on-delete-tenant-miete
               on-update-apartment on-load-costs on-edit-property prop-saving?
               persons-changes on-add-persons-change on-delete-persons-change
               nk-settlements on-delete-nk-settlement
               is-read-only? _on-go-back]}]
    (let [apartments           @(re-frame/subscribe [::subs/apartments])
          loading?             @(re-frame/subscribe [::subs/loading?])
          saving?              @(re-frame/subscribe [::subs/saving?])
          onboarding?          @(re-frame/subscribe [::subs/onboarding?])
          onboarding-status    @(re-frame/subscribe [::subs/onboarding-status])
          onboardings-by-apt   @(re-frame/subscribe [::subs/onboardings-by-apartment])
          add-dialog-open?     @(re-frame/subscribe [::subs/add-dialog-open?])
          selected-id          @(re-frame/subscribe [::subs/selected-apartment-id])
          initial-tab          @(re-frame/subscribe [::subs/initial-tab])
          current-year         @(re-frame/subscribe [::subs/current-year])
          new-code             @(re-frame/subscribe [::subs/new-apartment-code])
          new-wohnflaeche      @(re-frame/subscribe [::subs/new-apartment-wohnflaeche])
          new-strom            @(re-frame/subscribe [::subs/new-apartment-strom-zaehler-nr])
          new-wasser           @(re-frame/subscribe [::subs/new-apartment-wasser-zaehler-nrn])
          apt-save-error       @(re-frame/subscribe [::subs/apartment-save-error])
          assign-apt-id        @(re-frame/subscribe [::subs/assign-apt-id])
          assign-error         @(re-frame/subscribe [::subs/assign-error])
          garages              @(re-frame/subscribe [::subs/garages])
          garages-saving?      @(re-frame/subscribe [::subs/garages-saving?])
          garage-add-open?     @(re-frame/subscribe [::subs/garage-add-dialog-open?])
          selected-garage-id   @(re-frame/subscribe [::subs/selected-garage-id])
          new-garage-code      @(re-frame/subscribe [::subs/new-garage-code])
          new-garage-flaeche   @(re-frame/subscribe [::subs/new-garage-flaeche])
          new-garage-rent      @(re-frame/subscribe [::subs/new-garage-monthly-rent])
          new-garage-tenant-id @(re-frame/subscribe [::subs/new-garage-tenant-id])
          selected-apt         (when selected-id (first (filter #(= (:db/id %) selected-id) apartments)))
          selected-garage      (when selected-garage-id (first (filter #(= (:db/id %) selected-garage-id) garages)))
          assign-apt           (when assign-apt-id (first (filter #(= (:db/id %) assign-apt-id) apartments)))
          is-read-only?        is-read-only?]
      (cond
        selected-id
        [apartment-view
         {:apartment               (clj->js selected-apt)
          :apartments              (clj->js apartments)
          :initialTab              initial-tab
          :currentYear             current-year
          :onTabChange             (fn [tab] (re-frame/dispatch [::events/set-apartment-tab tab]))
          :onYearChange            (fn [y]   (re-frame/dispatch [::events/set-apartment-year y]))
          :isReadOnly              is-read-only?
          :createTenantError       (when assign-error (name assign-error))
          :tenants                 (clj->js (or tenants []))
          :properties              (clj->js (or properties []))
          :expenseTypes            (clj->js (or expense-types []))
          :aptCosts                (clj->js (or apt-costs []))
          :aptCostsLoading         apt-costs-loading?
          :aptCostsSaving          apt-costs-saving?
          :aptCostSaveError        apt-cost-save-error?
          :onLoadAptCosts          on-load-apt-costs
          :onAddAptCost            on-add-apt-cost
          :onUpdateAptCost         on-update-apt-cost
          :onDeleteAptCost         on-delete-apt-cost
          :allCosts                (clj->js (or all-costs []))
          :rentPayments            (clj->js (or rent-payments []))
          :rentLoading             rent-loading?
          :rentSaving              rent-saving?
          :onLoadRentPayments      on-load-rent-payments
          :onAddRentPayment        on-add-rent-payment
          :onUpdateRentPayment     on-update-rent-payment
          :onDeleteRentPayment     on-delete-rent-payment
          :tenantMieten            tenant-mieten
          :mieteSaving             miete-saving?
          :onUpsertTenantMiete     on-upsert-tenant-miete
          :onDeleteTenantMiete     on-delete-tenant-miete
          :onUpdateApartment       on-update-apartment
          :onLoadCosts             on-load-costs
          :onEditProperty          on-edit-property
          :propertySaving          prop-saving?
          :isSaving                saving?
          :tenantsSaving           tenants-saving?
          :personsChanges          (clj->js (or persons-changes []))
          :onAddPersonsChange      on-add-persons-change
          :onDeletePersonsChange   on-delete-persons-change
          :nkSettlements           (clj->js (or nk-settlements []))
          :onDeleteNkSettlement    on-delete-nk-settlement
          :isOnboarding            onboarding?
          :onboardingStatus        (clj->js onboarding-status)
          :onBack                  #(re-frame/dispatch [::events/clear-selected-apartment])
          :onDelete                (fn [id] (re-frame/dispatch [::events/delete-apartment id]))
          :onToggleOccupied        (fn [id occupied]
                                     (re-frame/dispatch [::events/update-apartment id {:occupied occupied}]))
          :onStartOnboarding       (fn [id email]
                                     (re-frame/dispatch [::events/start-onboarding id email]))
          :onAssignExistingTenant  (fn [apt-id tenant-id]
                                     (re-frame/dispatch [::events/assign-existing-tenant apt-id tenant-id]))
          :onAfterAssign           on-after-assign
          :onUpdateTenant          on-update-tenant
          :onCreateTenant          (fn [apt-id data]
                                     (let [d (js->clj data :keywordize-keys true)]
                                       (re-frame/dispatch [::events/assign-tenant
                                                           apt-id
                                                           {:first-name       (:firstName d)
                                                            :last-name        (:lastName d)
                                                            :email            (:email d)
                                                            :phone            (:phone d)
                                                            :start-date       (:startDate d)
                                                            :end-date         (:endDate d)
                                                            :kaltmiete        (:kaltmiete d)
                                                            :nebenkosten-warm (:nebenkostenWarm d)
                                                            :residents-count  (:residentsCount d)}
                                                           on-after-assign])))}]

        selected-garage-id
        [garage-view
         {:garage           (clj->js selected-garage)
          :properties       (clj->js (or properties []))
          :tenants          (clj->js (or tenants []))
          :isSaving         garages-saving?
          :isReadOnly       is-read-only?
          :onBack           #(re-frame/dispatch [::events/clear-selected-garage])
          :onUpdate         (fn [id data]
                              (let [d (js->clj data :keywordize-keys true)]
                                (re-frame/dispatch [::events/update-garage id
                                                   (cond-> {}
                                                     (:code d)              (assoc :code (:code d))
                                                     (:flaeche d)           (assoc :flaeche (:flaeche d))
                                                     (some? (:monthlyRent d)) (assoc :monthly-rent (:monthlyRent d))
                                                     (some? (:occupied d))  (assoc :occupied (:occupied d)))])))
          :onDelete         (fn [id] (re-frame/dispatch [::events/delete-garage id]))
          :onAssignTenant   (fn [garage-id tenant-id]
                              (re-frame/dispatch [::events/assign-tenant-to-garage garage-id tenant-id]))
          :onUnassignTenant (fn [garage-id]
                              (re-frame/dispatch [::events/unassign-tenant-from-garage garage-id]))}]

        :else
        [apartments-list
         {:apartments                     (clj->js apartments)
          :tenants                        (clj->js (or tenants []))
          :isReadOnly                     is-read-only?
          :onboardingsByApartment         (clj->js onboardings-by-apt)
          :isLoading                      loading?
          :isAddApartmentDialogOpen       add-dialog-open?
          :onChangeAddApartmentDialogOpen #(re-frame/dispatch [::events/open-add-dialog])
          :onCloseAddApartmentDialog      #(re-frame/dispatch [::events/close-add-dialog])
          :onSelectApartment              (fn [id] (re-frame/dispatch [::events/select-apartment id]))
          :onAssignTenant                 (fn [id] (re-frame/dispatch [::events/open-assign-dialog id]))
          :onCloseAssignDialog            #(re-frame/dispatch [::events/close-assign-dialog])
          :isAssignDialogOpen             (boolean assign-apt-id)
          :assignDialogContent            (when assign-apt-id
                                            (r/as-element
                                             [assign-tenant
                                              {:apartmentCode (:apartment/code assign-apt)
                                               :isLoading     saving?
                                               :assignError   (when assign-error (name assign-error))
                                               :onClose       #(re-frame/dispatch [::events/close-assign-dialog])
                                               :onSubmit      (fn [data]
                                                                (let [d (js->clj data :keywordize-keys true)]
                                                                  (re-frame/dispatch [::events/assign-tenant
                                                                                      assign-apt-id
                                                                                      {:first-name (:firstName d)
                                                                                       :last-name  (:lastName d)
                                                                                       :email      (:email d)
                                                                                       :phone      (:phone d)
                                                                                       :start-date (:startDate d)}
                                                                                      on-after-assign])))}]))
          :garages                        (clj->js garages)
          :onSelectGarage                 (fn [id] (re-frame/dispatch [::events/select-garage id]))
          :isAddGarageDialogOpen          garage-add-open?
          :onChangeAddGarageDialogOpen    #(re-frame/dispatch [::events/open-add-garage-dialog])
          :onCloseAddGarageDialog         #(re-frame/dispatch [::events/close-add-garage-dialog])
          :addGarageDialogContent         (when garage-add-open?
                                            (r/as-element
                                             [add-garage
                                              {:properties       (clj->js properties)
                                               :tenants          (clj->js (or tenants []))
                                               :isLoading        garages-saving?
                                               :code             new-garage-code
                                               :flaeche          (or new-garage-flaeche "")
                                               :monthlyRent      (or new-garage-rent "")
                                               :selectedTenantId (when new-garage-tenant-id (str new-garage-tenant-id))
                                               :onClose         #(re-frame/dispatch [::events/close-add-garage-dialog])
                                               :onChangeCode    (fn [e]
                                                                  (re-frame/dispatch [::events/set-new-garage-code (.. e -target -value)]))
                                               :onChangeProperty (fn [v]
                                                                   (re-frame/dispatch [::events/set-new-garage-property-id v]))
                                               :onChangeTenant   (fn [v]
                                                                   (re-frame/dispatch [::events/set-new-garage-tenant-id
                                                                                       (when (seq v) (js/parseInt v))]))
                                               :onChangeFlaeche (fn [e]
                                                                  (let [v (.. e -target -value)]
                                                                    (re-frame/dispatch [::events/set-new-garage-flaeche
                                                                                        (when (seq v) (js/parseFloat v))])))
                                               :onChangeMonthlyRent (fn [e]
                                                                      (let [v (.. e -target -value)]
                                                                        (re-frame/dispatch [::events/set-new-garage-monthly-rent
                                                                                            (when (seq v) (js/parseFloat v))])))
                                               :onSubmit        #(re-frame/dispatch [::events/add-garage])}]))}
         (when add-dialog-open?
           (r/as-element
            [add-apartment
             {:id                              "add-apartment"
              :properties                      (clj->js properties)
              :apartments                      (clj->js apartments)
              :isLoading                       saving?
              :saveError                       apt-save-error
              :code                            new-code
              :wohnflaeche                     (or new-wohnflaeche "")
              :stromZaehlerNr                  (or new-strom "")
              :wasserZaehlerNrn                (clj->js (or new-wasser []))
              :onChangeAddApartmentDialogClose #(re-frame/dispatch [::events/close-add-dialog])
              :onChangeCode                    (fn [e]
                                                (re-frame/dispatch [::events/set-new-code (.. e -target -value)]))
              :onChangeProperty                (fn [v]
                                                (re-frame/dispatch [::events/set-new-property-id v]))
              :onChangeWohnflaeche             (fn [e]
                                                (let [v (.. e -target -value)]
                                                  (re-frame/dispatch [::events/set-new-wohnflaeche
                                                                      (when (seq v) (js/parseFloat v))])))
              :onChangeStromZaehlerNr          (fn [v]
                                                (re-frame/dispatch [::events/set-new-strom-zaehler-nr v]))
              :onChangeWasserZaehlerNrn        (fn [arr]
                                                (re-frame/dispatch [::events/set-new-wasser-zaehler-nrn
                                                                    (js->clj arr)]))
              :submitApartment                 #(re-frame/dispatch [::events/add-apartment])}]))]))))
