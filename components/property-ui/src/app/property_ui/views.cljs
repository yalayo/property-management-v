(ns app.property-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.property-ui.subs :as subs]
            [app.property-ui.events :as events]
            ["/components/dashboard/PropertyList$default" :as property-list-js]))

(def property-list (r/adapt-react-class property-list-js))

(defn component [_]
  (re-frame/dispatch [::events/load-properties])
  (fn [_]
    (let [properties @(re-frame/subscribe [::subs/properties])
          saving?    @(re-frame/subscribe [::subs/saving?])]
      [property-list
       {:properties    (clj->js properties)
        :isSaving      saving?
        :onAddProperty (fn [data]
                         (let [d (js->clj data :keywordize-keys true)]
                           (re-frame/dispatch
                            [::events/add-property
                             {:name            (:name d)
                              :address         (:address d)
                              :city            (:city d)
                              :postal-code     (:postalCode d)
                              :units           (:units d)
                              :purchase-price  (:purchasePrice d)
                              :current-value   (:currentValue d)}])))
        :onGoBack      #(re-frame/dispatch [::events/go-to-dashboard])}])))
