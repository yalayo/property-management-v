(ns app.payment-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.payment-ui.subs :as subs]
            [app.payment-ui.events :as events]
            [app.payment-ui.config :as config]
            ["/pages/payment$default"                             :as payment-js]
            ["/components/payment/PostPaymentRegistration$default" :as register-js]))

(def payment-page (r/adapt-react-class payment-js))
(def register-page (r/adapt-react-class register-js))

(defn component [_]
  (fn [_]
    (let [step          @(re-frame/subscribe [::subs/step])
          tier-id       @(re-frame/subscribe [::subs/tier-id])
          client-secret @(re-frame/subscribe [::subs/client-secret])
          intent-type   @(re-frame/subscribe [::subs/intent-type])
          loading?      @(re-frame/subscribe [::subs/loading?])
          error         @(re-frame/subscribe [::subs/error])
          intent-id     @(re-frame/subscribe [::subs/intent-id])]
      (case step
        :checkout
        [payment-page
         {:tier            tier-id
          :clientSecret    client-secret
          :isLoadingSecret loading?
          :secretError     error
          :intentType      (name (or intent-type :payment))
          :onBack          #(re-frame/dispatch [::events/back-to-pricing])
          :onPaymentSuccess (fn [id] (re-frame/dispatch [::events/payment-success id]))}]

        :register
        [register-page
         {:tier            tier-id
          :paymentIntentId intent-id
          :apiUrl          (config/get-api-url)
          :onDone          #(re-frame/dispatch [::events/registration-done])}]

        ;; default — should not be visible, but safe fallback
        [:div]))))
