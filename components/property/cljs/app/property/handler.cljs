(ns app.property.handler
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-properties [{:keys [_request _env]}]
  (js-await [eids       (storage/find-by-type "property")
             properties (storage/pull-many eids '[*])]
            (cf/response-edn {:properties properties} {:status 200})))

(defn create-property [{:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [user-id name address city postal-code country units
                          acquisition-date purchase-price current-value]} data]
              (js-await [{:keys [tx-id entity-ids]}
                         (storage/transact!
                          [{:db/type                   "property"
                            :property/user-id          (or user-id "")
                            :property/name             name
                            :property/address          address
                            :property/city             city
                            :property/postal-code      postal-code
                            :property/country          (or country "Germany")
                            :property/units            (or units 1)
                            :property/acquisition-date acquisition-date
                            :property/purchase-price   purchase-price
                            :property/current-value    current-value}])]
                        (cf/response-edn {:tx-id       tx-id
                                          :property-id (first entity-ids)}
                                         {:status 201})))))

(defn update-property [{:keys [request route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [name address city postal-code country units
                            purchase-price current-value]} data]
                (js-await [{:keys [tx-id]}
                            (storage/transact!
                             [{:db/id                   eid
                               :property/name           name
                               :property/address        address
                               :property/city           city
                               :property/postal-code    postal-code
                               :property/country        country
                               :property/units          units
                               :property/purchase-price purchase-price
                               :property/current-value  current-value}])]
                           (cf/response-edn {:tx-id tx-id} {:status 200}))))))

(defn delete-property [{:keys [route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [_ (storage/excise! eid)]
              (cf/response-edn {:ok true} {:status 200}))))
