(ns app.property.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-properties [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:properties]
                                                    :order-by [[:id :desc]]})]
            (if success
              (cf/response-edn {:properties results} {:status 200})
              (cf/response-error "Failed to load properties"))))

(defn create-property [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [user-id name address city postal-code country units
                          acquisition-date purchase-price current-value]} data]
              (js-await [result (db/run+ env
                                        {:insert-into [:properties]
                                         :columns     [:user_id :name :address :city
                                                       :postal_code :country :units
                                                       :acquisition_date :purchase_price
                                                       :current_value]
                                         :values      [[(or user-id "")
                                                        name address city
                                                        postal-code
                                                        (or country "Germany")
                                                        (or units 1)
                                                        acquisition-date
                                                        purchase-price
                                                        current-value]]})]
                        (if (:success result)
                          (cf/response-edn {:ok true} {:status 201})
                          (cf/response-error "Failed to create property"))))))
