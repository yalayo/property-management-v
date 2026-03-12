(ns app.apartment.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-apartments [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:props_apartments]
                                                    :order-by [[:id :desc]]})]
            (if success
              (cf/response-edn {:apartments results} {:status 200})
              (cf/response-error "Failed to load apartments"))))

(defn get-apartments-by-property [{:keys [_request _env route]}]
  (let [property-id (-> route :path-params :property-id)]
    (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                      :from     [:props_apartments]
                                                      :where    [:= :property_id (js/parseInt property-id 10)]
                                                      :order-by [[:id :asc]]})]
              (if success
                (cf/response-edn {:apartments results} {:status 200})
                (cf/response-error "Failed to load apartments")))))

(defn create-apartment [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [property-id code]} data]
              (js-await [result (db/run+ env
                                        {:insert-into [:props_apartments]
                                         :columns     [:property_id :code :occupied]
                                         :values      [[(js/parseInt (str property-id) 10)
                                                        code
                                                        0]]})]
                        (if (:success result)
                          (cf/response-edn {:ok true} {:status 201})
                          (cf/response-error "Failed to create apartment"))))))

(defn update-apartment [{:keys [request env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [code occupied]} data]
                (js-await [result (db/run+ env
                                          {:update :props_apartments
                                           :set    {:code     code
                                                    :occupied (if occupied 1 0)}
                                           :where  [:= :id (js/parseInt id 10)]})]
                          (if (:success result)
                            (cf/response-edn {:ok true} {:status 200})
                            (cf/response-error "Failed to update apartment")))))))

(defn delete-apartment [{:keys [env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [result (db/run+ env
                               {:delete-from :props_apartments
                                :where       [:= :id (js/parseInt id 10)]})]
              (if (:success result)
                (cf/response-edn {:ok true} {:status 200})
                (cf/response-error "Failed to delete apartment")))))
