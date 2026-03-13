(ns app.apartment-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.apartment-ui.subs :as subs]
            [app.apartment-ui.events :as events]
            ["/components/apartments/ApartmentsList$default"  :as apartments-list-js]
            ["/components/apartments/AddApartment$default"    :as add-apartment-js]
            ["/components/apartments/ManageApartment$default" :as manage-apartment-js]
            ["/components/apartments/AssignTenant$default"    :as assign-tenant-js]))

(def apartments-list  (r/adapt-react-class apartments-list-js))
(def add-apartment    (r/adapt-react-class add-apartment-js))
(def manage-apartment (r/adapt-react-class manage-apartment-js))
(def assign-tenant    (r/adapt-react-class assign-tenant-js))

(defn component [_]
  (re-frame/dispatch [::events/load-apartments])
  (fn [{:keys [properties on-go-back]}]
    (let [apartments        @(re-frame/subscribe [::subs/apartments])
          loading?          @(re-frame/subscribe [::subs/loading?])
          saving?           @(re-frame/subscribe [::subs/saving?])
          add-dialog-open?  @(re-frame/subscribe [::subs/add-dialog-open?])
          selected-id       @(re-frame/subscribe [::subs/selected-apartment-id])
          new-code          @(re-frame/subscribe [::subs/new-apartment-code])
          assign-apt-id     @(re-frame/subscribe [::subs/assign-apt-id])
          assign-name       @(re-frame/subscribe [::subs/assign-name])
          assign-email      @(re-frame/subscribe [::subs/assign-email])
          assign-phone      @(re-frame/subscribe [::subs/assign-phone])
          assign-start-date @(re-frame/subscribe [::subs/assign-start-date])
          selected-apt      (when selected-id (first (filter #(= (:id %) selected-id) apartments)))
          assign-apt        (when assign-apt-id (first (filter #(= (:id %) assign-apt-id) apartments)))]
      (if selected-id
        [manage-apartment
         {:apartment        (clj->js selected-apt)
          :isSaving         saving?
          :onBack           #(re-frame/dispatch [::events/clear-selected-apartment])
          :onDelete         (fn [id] (re-frame/dispatch [::events/delete-apartment id]))
          :onToggleOccupied (fn [id occupied]
                              (re-frame/dispatch [::events/update-apartment id {:occupied occupied}]))}]
        [:div
         [apartments-list
          {:apartments                     (clj->js apartments)
           :isLoading                      loading?
           :isAddApartmentDialogOpen       add-dialog-open?
           :onChangeAddApartmentDialogOpen #(re-frame/dispatch [::events/open-add-dialog])
           :onManageApartment              (fn [id] (re-frame/dispatch [::events/select-apartment id]))
           :onAssignTenant                 (fn [id] (re-frame/dispatch [::events/open-assign-dialog id]))
           :onGoBack                       on-go-back}
          (when add-dialog-open?
            (r/as-element
             [add-apartment
              {:id                              "add-apartment"
               :properties                      (clj->js properties)
               :isLoading                       saving?
               :code                            new-code
               :onChangeAddApartmentDialogClose #(re-frame/dispatch [::events/close-add-dialog])
               :onChangeCode                    (fn [e]
                                                 (re-frame/dispatch [::events/set-new-code (.. e -target -value)]))
               :onChangeProperty                (fn [v]
                                                 (re-frame/dispatch [::events/set-new-property-id v]))
               :submitApartment                 #(re-frame/dispatch [::events/add-apartment])}]))]
         ;; Assign tenant overlay — portal-style fixed backdrop
         (when assign-apt-id
           [:div {:style {:position "fixed" :inset "0" :z-index 50
                          :display "flex" :align-items "center" :justify-content "center"
                          :background "rgba(0,0,0,0.5)"}}
            [:div {:style {:background "white" :border-radius "8px" :padding "24px"
                           :width "100%" :max-width "440px" :margin "0 16px"}}
             [assign-tenant
              {:apartmentCode    (:code assign-apt)
               :isLoading        saving?
               :name             assign-name
               :email            assign-email
               :phone            assign-phone
               :startDate        assign-start-date
               :onClose          #(re-frame/dispatch [::events/close-assign-dialog])
               :onChangeName     (fn [e] (re-frame/dispatch [::events/set-assign-name (.. e -target -value)]))
               :onChangeEmail    (fn [e] (re-frame/dispatch [::events/set-assign-email (.. e -target -value)]))
               :onChangePhone    (fn [e] (re-frame/dispatch [::events/set-assign-phone (.. e -target -value)]))
               :onChangeStartDate (fn [e] (re-frame/dispatch [::events/set-assign-start-date (.. e -target -value)]))
               :onSubmit         #(re-frame/dispatch [::events/assign-tenant])}]]])]))))
