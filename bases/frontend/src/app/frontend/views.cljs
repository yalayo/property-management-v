(ns app.frontend.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.frontend.events :as events]
            [app.frontend.subs :as subs]
            ["/SignIn" :as signin]
            ["/NavBar" :as navbar]
            ["/ListAddresses" :as listaddresses]
            ["/RegisterAddress" :as registeraddress]))

(def signin-component (r/adapt-react-class (.-SignIn signin)))
(def navbar-component (r/adapt-react-class (.-NavBar navbar)))
(def listaddresses-component (r/adapt-react-class (.-ListAddresses listaddresses)))
(def registeraddress-component (r/adapt-react-class (.-RegisterAddress registeraddress)))

(defn app []
  [:<>
   [navbar-component {:newAddress #(re-frame/dispatch [::events/show-register-address-form])}]
   (if @(re-frame/subscribe [::subs/show-form])
     [registeraddress-component {:header @(re-frame/subscribe [::subs/form :header])
                                 :title @(re-frame/subscribe [::subs/form :title])
                                 :subject @(re-frame/subscribe [::subs/form :subject])
                                 :firstName @(re-frame/subscribe [::subs/form :first-name])
                                 :lastName @(re-frame/subscribe [::subs/form :last-name])
                                 :street @(re-frame/subscribe [::subs/form :street])
                                 :city @(re-frame/subscribe [::subs/form :city])
                                 :region @(re-frame/subscribe [::subs/form :region])
                                 :postalCode @(re-frame/subscribe [::subs/form :postal-code])
                                 :onChangeHeader #(re-frame/dispatch [::events/update-register-address-form :header (-> % .-target .-value)])
                                 :onChangeTitle #(re-frame/dispatch [::events/update-register-address-form :title (-> % .-target .-value)])
                                 :onChangeSubject #(re-frame/dispatch [::events/update-register-address-form :subject (-> % .-target .-value)])
                                 :onChangeFirstName #(re-frame/dispatch [::events/update-register-address-form :first-name (-> % .-target .-value)])
                                 :onChangeLastName #(re-frame/dispatch [::events/update-register-address-form :last-name (-> % .-target .-value)])
                                 :onChangeStreet #(re-frame/dispatch [::events/update-register-address-form :street (-> % .-target .-value)])
                                 :onChangeCity #(re-frame/dispatch [::events/update-register-address-form :city (-> % .-target .-value)])
                                 :onChangeRegion #(re-frame/dispatch [::events/update-register-address-form :region (-> % .-target .-value)])
                                 :onChangePostalCode #(re-frame/dispatch [::events/update-register-address-form :postal-code (-> % .-target .-value)])
                                 :isFormValid (not @(re-frame/subscribe [::subs/form-is-valid? [:first-name :last-name]]))
                                 :saveForm #(re-frame/dispatch [::events/save-register-address-form])
                                 :cancelForm #(re-frame/dispatch [::events/cancel-register-address-form])}]
     [listaddresses-component {:addresses @(re-frame/subscribe [::subs/addresses])}])])