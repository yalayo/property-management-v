(ns app.payment.handler
  (:require [clojure.string :as str]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(def tier-amounts
  {"done_for_you"  nil      ;; subscription — uses SetupIntent
   "done_with_you" 270000   ;; €2,700 in cents
   "done_by_you"   95000    ;; €950 in cents
   "crowdfunding"  37000})  ;; €370 in cents

(defn ->form-body [params]
  (let [p (js/URLSearchParams.)]
    (doseq [[k v] params]
      (.append p (if (string? k) k (name k)) (str v)))
    (.toString p)))

(defn stripe-post [stripe-key endpoint params]
  (js/fetch (str "https://api.stripe.com/v1/" endpoint)
            (clj->js {:method  "POST"
                      :headers {"Authorization"  (str "Bearer " stripe-key)
                                "Content-Type"   "application/x-www-form-urlencoded"}
                      :body    (->form-body params)})))

(defn create-payment-intent [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
    (let [tier-id    (name (:tier-id data))
          stripe-key (aget env "STRIPE_SECRET_KEY")
          amount     (get tier-amounts tier-id :invalid)]
      (cond
        (= amount :invalid)
        (cf/response-error "Invalid tier")

        (nil? amount)
        ;; Subscription tier — create a SetupIntent to collect payment method
        (js-await [resp (stripe-post stripe-key "setup_intents"
                                     {"usage"                      "off_session"
                                      "payment_method_types[]"     "card"})]
          (js-await [result (.json resp)]
            (let [d (js->clj result :keywordize-keys true)]
              (if (:error d)
                (cf/response-error (get-in d [:error :message] "Stripe error"))
                (cf/response-edn {:client-secret (:client_secret d)
                                  :type          "setup"} {:status 200})))))

        :else
        ;; One-time payment — create a PaymentIntent
        (js-await [resp (stripe-post stripe-key "payment_intents"
                                     {"amount"           amount
                                      "currency"         "eur"
                                      "metadata[tier]"   tier-id
                                      "automatic_payment_methods[enabled]" "true"})]
          (js-await [result (.json resp)]
            (let [d (js->clj result :keywordize-keys true)]
              (if (:error d)
                (cf/response-error (get-in d [:error :message] "Stripe error"))
                (cf/response-edn {:client-secret (:client_secret d)
                                  :type          "payment"} {:status 200})))))))))

(defn register-after-payment [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
    (let [email             (:email data)
          password          (:password data)
          full-name         (:full-name data)
          payment-intent-id (:payment-intent-id data)
          tier              (:tier data)]
      ;; Store the user — password hashing should be done server-side in production
      (cf/response-edn {:ok true :message "Account created"} {:status 201}))))
