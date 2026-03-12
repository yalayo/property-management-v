(ns app.dashboard.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

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
