(ns app.plans.handler
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-plans [{:keys [_request _env]}]
  (js-await [eids  (storage/find-by-attr :plan/active true)
             plans (storage/pull-many eids [:plan/name :plan/price
                                            :plan/features :plan/sort-order])]
            (cf/response-edn {:plans (sort-by :plan/sort-order plans)}
                             {:status 200})))

(defn get-plan [{:keys [route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [plan (storage/entity eid)]
              (if (seq (dissoc plan :db/id))
                (cf/response-edn {:plan plan} {:status 200})
                (cf/response-error {:error "Plan not found"} {:status 404})))))

(defn create-plan [{:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [name price features sort-order]} data]
              (js-await [{:keys [tx-id entity-ids]}
                         (storage/transact!
                          [{:db/type         "plan"
                            :plan/name        name
                            :plan/price       price
                            :plan/features    (or features [])
                            :plan/sort-order  (or sort-order 0)
                            :plan/active      true}])]
                        (cf/response-edn {:tx-id    tx-id
                                          :plan-id  (first entity-ids)}
                                         {:status 201})))))

(defn update-plan [{:keys [request route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [attrs (dissoc data :db/id)]
                (js-await [{:keys [tx-id]}
                            (storage/transact!
                             [(merge {:db/id eid} (update-keys attrs #(keyword "plan" (name %))))])]
                           (cf/response-edn {:tx-id tx-id} {:status 200}))))))

(defn delete-plan [{:keys [route _env]}]
  (let [eid (-> route :path-params :id)]
    (js-await [{:keys [tx-id]}
               (storage/transact! [[:db/add eid :plan/active false]])]
              (cf/response-edn {:tx-id tx-id} {:status 200}))))
