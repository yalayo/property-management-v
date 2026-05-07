(ns app.tenant.handler
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-tenants [{:keys [_request _env]}]
  (js-await [eids    (storage/find-by-type "tenant")
             tenants (storage/pull-many eids '[*])]
            (cf/response-edn {:tenants tenants} {:status 200})))

(defn get-tenants-by-apartment [{:keys [_request _env route]}]
  (let [apartment-id (-> route :path-params :apartment-id)]
    (js-await [eids    (storage/find-by-attr :tenant/apartment-id apartment-id)
               tenants (storage/pull-many eids '[*])]
              (cf/response-edn {:tenants tenants} {:status 200}))))

(defn create-tenant [{:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [apartment-id name email phone start-date end-date]} data]
              (js-await [{:keys [tx-id entity-ids]}
                         (storage/transact!
                          [{:db/type             "tenant"
                            :tenant/apartment-id apartment-id
                            :tenant/name         name
                            :tenant/email        (or email "")
                            :tenant/phone        (or phone "")
                            :tenant/start-date   (or start-date "")
                            :tenant/end-date     (or end-date "")}])]
                        (cf/response-edn {:tx-id     tx-id
                                          :tenant-id (first entity-ids)}
                                         {:status 201})))))

(defn update-tenant [{:keys [request route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [name email phone start-date end-date]} data]
                (js-await [{:keys [tx-id]}
                            (storage/transact!
                             [{:db/id             eid
                               :tenant/name       name
                               :tenant/email      email
                               :tenant/phone      phone
                               :tenant/start-date start-date
                               :tenant/end-date   end-date}])]
                           (cf/response-edn {:tx-id tx-id} {:status 200}))))))

(defn delete-tenant [{:keys [route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [_ (storage/excise! eid)]
              (cf/response-edn {:ok true} {:status 200}))))
