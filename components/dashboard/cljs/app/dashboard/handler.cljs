(ns app.dashboard.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]
            [app.storage.interface :as storage]))

(defn get-occupancy [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select [[[:count :*] :total]
                                                             [[:sum :occupied] :occupied]]
                                                    :from   [:props_apartments]})]
            (if success
              (let [{:keys [total occupied]} (first results)
                    occupied (or occupied 0)
                    empty    (- total occupied)]
                (cf/response-edn {:total_apartments total
                                  :occupied         occupied
                                  :empty            empty}
                                 {:status 200}))
              (cf/response-error "Failed to load occupancy"))))

(defn get-public-stats [{:keys [_request _env]}]
  (js-await [landlord-eids (storage/find-by-type "account")
             property-eids (storage/find-by-type "property")
             vote-eids     (storage/find-by-type "satisfaction-vote")
             votes         (storage/pull-many vote-eids [:vote/satisfied])]
            (let [landlords    (count landlord-eids)
                  properties   (count property-eids)
                  total-votes  (count votes)
                  satisfied    (count (filter :vote/satisfied votes))
                  satisfaction (if (pos? total-votes)
                                 (int (* 100 (/ satisfied total-votes)))
                                 98)]
              (cf/response-edn {:landlords   landlords
                                :properties  properties
                                :satisfaction satisfaction}
                               {:status 200}))))

(defn post-satisfaction [{:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [satisfied session-id]} data]
              (js-await [_ (storage/transact!
                            [{:db/type        "satisfaction-vote"
                              :vote/satisfied  (boolean satisfied)
                              :vote/session-id (or session-id (str (random-uuid)))}])]
                        (cf/response-edn {:ok true} {:status 201})))))
