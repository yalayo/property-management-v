(ns app.plans.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-plans [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select [:*]
                                                    :from   [:plans]
                                                    :where  [:= :active 1]
                                                    :order-by [[:sort_order :asc]]})]
            (if success
              (cf/response-edn {:plans results} {:status 200})
              (cf/response-error "Failed to load plans"))))
