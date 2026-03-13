(ns app.tenant-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.tenant-ui.subs :as subs]
            [app.tenant-ui.events :as events]
            ["/components/tenants/TenantsList$default"  :as tenants-list-js]
            ["/components/tenants/AddTenant$default"    :as add-tenant-js]
            ["/components/tenants/ManageTenant$default" :as manage-tenant-js]))

(def tenants-list  (r/adapt-react-class tenants-list-js))
(def add-tenant    (r/adapt-react-class add-tenant-js))
(def manage-tenant (r/adapt-react-class manage-tenant-js))

(defn component [_]
  (re-frame/dispatch [::events/load-tenants])
  (fn [{:keys [apartments]}]
    (let [tenants          @(re-frame/subscribe [::subs/tenants])
          loading?         @(re-frame/subscribe [::subs/loading?])
          saving?          @(re-frame/subscribe [::subs/saving?])
          add-dialog-open? @(re-frame/subscribe [::subs/add-dialog-open?])
          selected-id      @(re-frame/subscribe [::subs/selected-tenant-id])
          new-name         @(re-frame/subscribe [::subs/new-name])
          new-email        @(re-frame/subscribe [::subs/new-email])
          new-phone        @(re-frame/subscribe [::subs/new-phone])
          new-start-date   @(re-frame/subscribe [::subs/new-start-date])
          selected-tenant  (when selected-id (first (filter #(= (:id %) selected-id) tenants)))]
      (if selected-id
        [manage-tenant
         {:tenant   (clj->js selected-tenant)
          :isSaving saving?
          :onBack   #(re-frame/dispatch [::events/clear-selected-tenant])
          :onDelete (fn [id] (re-frame/dispatch [::events/delete-tenant id]))
          :onUpdate (fn [id data]
                      (let [d (js->clj data :keywordize-keys true)]
                        (re-frame/dispatch [::events/update-tenant id
                                            {:name       (:name d)
                                             :email      (:email d)
                                             :phone      (:phone d)
                                             :start-date (:start_date d)
                                             :end-date   (:end_date d)}])))}]
        [tenants-list
         {:tenants              (clj->js tenants)
          :isLoading            loading?
          :isAddTenantDialogOpen add-dialog-open?
          :onOpenAddTenantDialog #(re-frame/dispatch [::events/open-add-dialog])
          :onManageTenant        (fn [id] (re-frame/dispatch [::events/select-tenant id]))}
         (when add-dialog-open?
           (r/as-element
            [add-tenant
             {:apartments      (clj->js (or apartments []))
              :isLoading       saving?
              :name            new-name
              :email           new-email
              :phone           new-phone
              :startDate       new-start-date
              :onClose         #(re-frame/dispatch [::events/close-add-dialog])
              :onChangeName    (fn [e] (re-frame/dispatch [::events/set-new-name (.. e -target -value)]))
              :onChangeEmail   (fn [e] (re-frame/dispatch [::events/set-new-email (.. e -target -value)]))
              :onChangePhone   (fn [e] (re-frame/dispatch [::events/set-new-phone (.. e -target -value)]))
              :onChangeStartDate (fn [e] (re-frame/dispatch [::events/set-new-start-date (.. e -target -value)]))
              :onChangeApartment (fn [v] (re-frame/dispatch [::events/set-new-apartment-id v]))
              :onSubmit        #(re-frame/dispatch [::events/add-tenant])}]))]))))
