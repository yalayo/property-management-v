(ns app.property.handler
  (:require [app.worker.async :refer [js-await]]
            [app.storage.interface :as storage]
            [app.worker.cf :as cf]))

(defn get-properties [storage {:keys [_request _env]}]
  (js-await [{:keys [success results]} (storage/query+ storage {:select   [:*]
                                                                 :from     [:props_properties]
                                                                 :order-by [[:id :desc]]})]
            (if success
              (cf/response-edn {:properties results} {:status 200})
              (cf/response-error "Failed to load properties"))))

(defn create-property [storage {:keys [request _env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [user-id name address city postal-code country units
                          acquisition-date purchase-price current-value]} data]
              (js-await [result (storage/run+ storage
                                               {:insert-into [:props_properties]
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

(defn update-property [storage {:keys [request _env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [name address city postal-code country units
                            purchase-price current-value]} data]
                (js-await [result (storage/run+ storage
                                                 {:update :props_properties
                                                  :set    {:name           name
                                                           :address        address
                                                           :city           city
                                                           :postal_code    postal-code
                                                           :country        country
                                                           :units          units
                                                           :purchase_price purchase-price
                                                           :current_value  current-value}
                                                  :where  [:= :id (js/parseInt id 10)]})]
                          (if (:success result)
                            (cf/response-edn {:ok true} {:status 200})
                            (cf/response-error "Failed to update property")))))))

(defn delete-property [storage {:keys [_env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [result (storage/run+ storage
                                     {:delete-from :props_properties
                                      :where       [:= :id (js/parseInt id 10)]})]
              (if (:success result)
                (cf/response-edn {:ok true} {:status 200})
                (cf/response-error "Failed to delete property")))))
