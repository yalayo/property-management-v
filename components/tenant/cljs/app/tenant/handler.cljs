(ns app.tenant.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.db :as db]
            [app.worker.cf :as cf]))

(defn get-tenants [{:keys [_request _env]}]
  (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                    :from     [:props_tenants]
                                                    :order-by [[:id :desc]]})]
            (if success
              (cf/response-edn {:tenants results} {:status 200})
              (cf/response-error "Failed to load tenants"))))

(defn get-tenants-by-apartment [{:keys [_request _env route]}]
  (let [apartment-id (-> route :path-params :apartment-id)]
    (js-await [{:keys [success results]} (db/query+ {:select   [:*]
                                                      :from     [:props_tenants]
                                                      :where    [:= :apartment_id (js/parseInt apartment-id 10)]
                                                      :order-by [[:id :asc]]})]
              (if success
                (cf/response-edn {:tenants results} {:status 200})
                (cf/response-error "Failed to load tenants")))))

(defn create-tenant [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [apartment-id name email phone start-date end-date]} data]
              (js-await [result (db/run+ env
                                        {:insert-into [:props_tenants]
                                         :columns     [:apartment_id :name :email :phone :start_date :end_date]
                                         :values      [[(js/parseInt (str apartment-id) 10)
                                                        name
                                                        (or email "")
                                                        (or phone "")
                                                        (or start-date "")
                                                        (or end-date "")]]})]
                        (if (:success result)
                          (cf/response-edn {:ok true} {:status 201})
                          (cf/response-error "Failed to create tenant"))))))

(defn update-tenant [{:keys [request env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [data (cf/request->edn request)]
              (let [{:keys [name email phone start-date end-date]} data]
                (js-await [result (db/run+ env
                                          {:update :props_tenants
                                           :set    {:name       name
                                                    :email      email
                                                    :phone      phone
                                                    :start_date start-date
                                                    :end_date   end-date}
                                           :where  [:= :id (js/parseInt id 10)]})]
                          (if (:success result)
                            (cf/response-edn {:ok true} {:status 200})
                            (cf/response-error "Failed to update tenant")))))))

(defn delete-tenant [{:keys [env route]}]
  (let [id (-> route :path-params :id)]
    (js-await [result (db/run+ env
                               {:delete-from :props_tenants
                                :where       [:= :id (js/parseInt id 10)]})]
              (if (:success result)
                (cf/response-edn {:ok true} {:status 200})
                (cf/response-error "Failed to delete tenant")))))
