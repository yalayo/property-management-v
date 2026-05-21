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
  {:property   :get-properties
   :apartment  :get-apartments
   :tenant     :get-tenants
   :onboarding :get-onboardings
   :cost       :get-costs})

(defn query
  "Returns a Reitit route handler for POST queries.
  Reads :entity from the EDN body and maps it to a read command."
  [_core _storage controller]
  (fn [{:keys [request user env]}]
    (js-await [body (cf/request->edn request)]
              (let [entity  (:entity body)
                    command (cond
                              (and (= entity :apartment) (:property-id body)) :get-apartments-by-property
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
