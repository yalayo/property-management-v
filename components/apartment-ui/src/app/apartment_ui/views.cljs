(ns app.apartment-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.apartment-ui.subs :as subs]
            [app.apartment-ui.events :as events]
            ["/components/apartments/ApartmentsList$default"  :as apartments-list-js]
            ["/components/apartments/AddApartment$default"    :as add-apartment-js]
            ["/components/apartments/ManageApartment$default" :as manage-apartment-js]
            ["/components/apartments/ApartmentDetail$default" :as apartment-detail-js]
            ["/components/apartments/AssignTenant$default"    :as assign-tenant-js]))

(def apartments-list  (r/adapt-react-class apartments-list-js))
(def add-apartment    (r/adapt-react-class add-apartment-js))
(def manage-apartment (r/adapt-react-class manage-apartment-js))
(def apartment-detail (r/adapt-react-class apartment-detail-js))
(def assign-tenant    (r/adapt-react-class assign-tenant-js))

(defn component [_]
  (re-frame/dispatch [::events/load-apartments])
  (re-frame/dispatch [::events/close-assign-dialog])
  (fn [{:keys [properties tenants expense-types on-after-assign on-update-tenant tenants-saving?
               apt-costs apt-costs-loading? apt-costs-saving?
               on-load-apt-costs on-add-apt-cost on-update-apt-cost on-delete-apt-cost
               rent-payments rent-loading? rent-saving?
               on-load-rent-payments on-add-rent-payment on-update-rent-payment on-delete-rent-payment
               _on-go-back]}]
    (let [apartments       @(re-frame/subscribe [::subs/apartments])
          loading?         @(re-frame/subscribe [::subs/loading?])
          saving?          @(re-frame/subscribe [::subs/saving?])
          onboarding?      @(re-frame/subscribe [::subs/onboarding?])
          onboarding-status     @(re-frame/subscribe [::subs/onboarding-status])
          onboardings-by-apt    @(re-frame/subscribe [::subs/onboardings-by-apartment])
          add-dialog-open? @(re-frame/subscribe [::subs/add-dialog-open?])
          selected-id      @(re-frame/subscribe [::subs/selected-apartment-id])
          detail-apt-id    @(re-frame/subscribe [::subs/detail-apartment-id])
          new-code         @(re-frame/subscribe [::subs/new-apartment-code])
          assign-apt-id    @(re-frame/subscribe [::subs/assign-apt-id])
          selected-apt     (when selected-id (first (filter #(= (:db/id %) selected-id) apartments)))
          detail-apt       (when detail-apt-id (first (filter #(= (:db/id %) detail-apt-id) apartments)))
          assign-apt       (when assign-apt-id (first (filter #(= (:db/id %) assign-apt-id) apartments)))]
      (cond
        selected-id
        [manage-apartment
         {:apartment               (clj->js selected-apt)
          :tenants                 (clj->js (or tenants []))
          :isSaving                saving?
          :tenantsSaving           tenants-saving?
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
                                                           {:name       (:name d)
                                                            :email      (:email d)
                                                            :phone      (:phone d)
                                                            :start-date (:startDate d)
                                                            :end-date   (:endDate d)}
                                                           on-after-assign])))}]

        detail-apt-id
        [apartment-detail
         {:apartment           (clj->js detail-apt)
          :properties          (clj->js (or properties []))
          :tenants             (clj->js (or tenants []))
          :expenseTypes        (clj->js (or expense-types []))
          :aptCosts            (clj->js (or apt-costs []))
          :aptCostsLoading     apt-costs-loading?
          :aptCostsSaving      apt-costs-saving?
          :onLoadAptCosts      on-load-apt-costs
          :onAddAptCost        on-add-apt-cost
          :onUpdateAptCost     on-update-apt-cost
          :onDeleteAptCost     on-delete-apt-cost
          :rentPayments        (clj->js (or rent-payments []))
          :rentLoading         rent-loading?
          :rentSaving          rent-saving?
          :onLoadRentPayments  on-load-rent-payments
          :onAddRentPayment    on-add-rent-payment
          :onUpdateRentPayment on-update-rent-payment
          :onDeleteRentPayment on-delete-rent-payment
          :onBack              #(re-frame/dispatch [::events/clear-apartment-detail])}]

        :else
        [apartments-list
         {:apartments                     (clj->js apartments)
          :onboardingsByApartment         (clj->js onboardings-by-apt)
          :isLoading                      loading?
          :isAddApartmentDialogOpen       add-dialog-open?
          :onChangeAddApartmentDialogOpen #(re-frame/dispatch [::events/open-add-dialog])
          :onSelectApartment              (fn [id] (re-frame/dispatch [::events/select-apartment-detail id]))
          :onManageApartment              (fn [id] (re-frame/dispatch [::events/select-apartment id]))
          :onAssignTenant                 (fn [id] (re-frame/dispatch [::events/open-assign-dialog id]))
          :onCloseAssignDialog            #(re-frame/dispatch [::events/close-assign-dialog])
          :isAssignDialogOpen             (boolean assign-apt-id)
          :assignDialogContent            (when assign-apt-id
                                            (r/as-element
                                             [assign-tenant
                                              {:apartmentCode (:apartment/code assign-apt)
                                               :isLoading     saving?
                                               :onClose       #(re-frame/dispatch [::events/close-assign-dialog])
                                               :onSubmit      (fn [data]
                                                                (let [d (js->clj data :keywordize-keys true)]
                                                                  (re-frame/dispatch [::events/assign-tenant
                                                                                      assign-apt-id
                                                                                      {:name       (:name d)
                                                                                       :email      (:email d)
                                                                                       :phone      (:phone d)
                                                                                       :start-date (:startDate d)}
                                                                                      on-after-assign])))}]))}
         (when add-dialog-open?
           (r/as-element
            [add-apartment
             {:id                              "add-apartment"
              :properties                      (clj->js properties)
              :apartments                      (clj->js apartments)
              :isLoading                       saving?
              :code                            new-code
              :onChangeAddApartmentDialogClose #(re-frame/dispatch [::events/close-add-dialog])
              :onChangeCode                    (fn [e]
                                                (re-frame/dispatch [::events/set-new-code (.. e -target -value)]))
              :onChangeProperty                (fn [v]
                                                (re-frame/dispatch [::events/set-new-property-id v]))
              :submitApartment                 #(re-frame/dispatch [::events/add-apartment])}]))]))))
