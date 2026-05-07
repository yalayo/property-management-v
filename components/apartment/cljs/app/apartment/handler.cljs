(ns app.apartment.handler
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-apartments [{:keys [_request _env]}]
  (js-await [eids       (storage/find-by-type "apartment")
             apartments (storage/pull-many eids '[*])]
            (cf/response-edn {:apartments apartments} {:status 200})))

(defn get-apartments-by-property [{:keys [_request _env route]}]
  (let [property-id (-> route :path-params :property-id)]
    (js-await [eids       (storage/find-by-attr :apartment/property-id property-id)
               apartments (storage/pull-many eids '[*])]
              (cf/response-edn {:apartments apartments} {:status 200}))))

(defn create-apartment [{:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [property-id code]} data]
              (js-await [{:keys [tx-id entity-ids]}
                         (storage/transact!
                          [{:db/type               "apartment"
                            :apartment/property-id property-id
                            :apartment/code        code
                            :apartment/occupied    false}])]
                        (cf/response-edn {:tx-id        tx-id
                                          :apartment-id (first entity-ids)}
                                         {:status 201})))))

(defn update-apartment [{:keys [request route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [code occupied]} data]
                (js-await [{:keys [tx-id]}
                            (storage/transact!
                             [{:db/id              eid
                               :apartment/code     code
                               :apartment/occupied (boolean occupied)}])]
                           (cf/response-edn {:tx-id tx-id} {:status 200}))))))

(defn delete-apartment [{:keys [route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [_ (storage/excise! eid)]
              (cf/response-edn {:ok true} {:status 200}))))

(defn get-all-onboardings [_]
  (js-await [eids        (storage/find-by-type "onboarding")
             onboardings (storage/pull-many eids '[*])]
            (cf/response-edn {:onboardings onboardings} {:status 200})))

(defn get-onboarding [{:keys [route _env]}]
  (let [apartment-id (-> route :path-params :id)]
    (js-await [eids (storage/find-by-attr :onboarding/apartment-id apartment-id)]
              (if-let [eid (first eids)]
                (js-await [onboarding (storage/entity eid)]
                          (cf/response-edn {:onboarding onboarding} {:status 200}))
                (cf/response-edn {:onboarding nil} {:status 200})))))

(defn start-onboarding [{:keys [request route _env]}]
  (let [apartment-id (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [email]} data]
                (if (or (nil? email) (empty? email))
                  (cf/response-error "Email is required" {:status 400})
                  (js-await [{:keys [tx-id entity-ids]}
                              (storage/transact!
                               [{:db/type                  "onboarding"
                                 :onboarding/apartment-id  apartment-id
                                 :onboarding/email         email
                                 :onboarding/status        "pending"}])]
                             (cf/response-edn {:tx-id        tx-id
                                               :onboarding-id (first entity-ids)}
                                              {:status 201})))))))
