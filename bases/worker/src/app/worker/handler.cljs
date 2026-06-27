(ns app.worker.handler
  (:require
   [app.worker.async :refer [js-await]]
   [app.worker.cf :as cf]))

(defn command
  "Returns a Reitit route handler that delegates to the controller.
  Called once at Integrant init time."
  [_core _storage controller]
  (fn [{:keys [request env user]}]
    (js-await [body (cf/request->edn request)]
              (let [{:keys [command data]} body]
                (js-await [result (controller {:command command :data data :user user :env env})]
                          (if (:error result)
                            (cf/response-edn result {:status 400})
                            (cf/response-edn result {:status 200})))))))

(def ^:private entity->command
  {:property              :get-properties
   :apartment             :get-apartments
   :tenant                :get-tenants
   :onboarding            :get-onboardings
   :cost                  :get-costs
   :apartment-cost        :get-apartment-costs
   :rent-payment          :get-rent-payments
   :expense-type          :get-expense-types
   :org-users             :list-org-users
   :admin-users           :admin-list-users
   :survey-questions      :get-survey-questions
   :property-tax-config   :get-property-tax-configs
   :property-loan         :get-property-loans
   :tenant-miete          :get-all-tenant-mieten
   :garage                :get-all-garages})

(defn survey-questions
  "Public GET handler — returns all survey questions, no auth required."
  [_core _storage controller]
  (fn [{:keys [env]}]
    (js-await [result (controller {:command :get-survey-questions :data {} :user nil :env env})]
              (if (:error result)
                (cf/response-edn result {:status 400})
                (cf/response-edn result {:status 200})))))

(defn survey-submit
  "Public POST handler — saves a visitor's survey response, no auth required."
  [_core _storage controller]
  (fn [{:keys [request env]}]
    (js-await [body (cf/request->edn request)]
              (js-await [result (controller {:command :submit-survey :data body :user nil :env env})]
                        (if (:error result)
                          (cf/response-edn result {:status 400})
                          (cf/response-edn result {:status 200}))))))

(defn query
  "Returns a Reitit route handler for POST queries.
  Reads :entity from the EDN body and maps it to a read command."
  [_core _storage controller]
  (fn [{:keys [request user env]}]
    (js-await [body (cf/request->edn request)]
              (let [entity  (:entity body)
                    command (cond
                              (and (= entity :apartment)      (:property-id body))  :get-apartments-by-property
                              (and (= entity :cost)           (:property-id body))  :get-costs
                              (= entity :cost)                                       :get-all-costs
                              (and (= entity :apartment-cost) (:apartment-id body)) :get-apartment-costs
                              (= entity :apartment-cost)                             :get-all-apartment-costs
                              (and (= entity :rent-payment)   (:apartment-id body)) :get-rent-payments
                              (= entity :rent-payment)                               :get-all-rent-payments
                              :else (get entity->command entity))]
                (if-not command
                  (cf/response-edn {:error :unknown-entity} {:status 400})
                  (js-await [result (controller {:command command
                                                 :data    (dissoc body :entity)
                                                 :user    user
                                                 :env     env})]
                            (if (:error result)
                              (cf/response-edn result {:status 400})
                              (cf/response-edn result {:status 200}))))))))
