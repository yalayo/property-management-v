(ns app.tenant.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-tenants [controller]
  (fn [{:keys [_request _env user]}]
    (js-await [result (controller {:command :get-tenants :user user})]
              (cf/response-edn result {:status 200}))))

(defn get-tenants-by-apartment [controller]
  (fn [{:keys [_request _env route user]}]
    (let [apartment-id (-> route :path-params :apartment-id)]
      (js-await [result (controller {:command :get-tenants-by-apartment
                                     :data    {:apartment-id apartment-id}
                                     :user    user})]
                (cf/response-edn result {:status 200})))))

(defn create-tenant [controller]
  (fn [{:keys [request _env user]}]
    (js-await [data   (cf/request->edn request)
               result (controller {:command :create-tenant :data data :user user})]
              (if (:error result)
                (cf/response-edn result {:status 400})
                (cf/response-edn result {:status 201})))))

(defn update-tenant [controller]
  (fn [{:keys [request route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [data   (cf/request->edn request)
                 result (controller {:command :update-tenant
                                     :data    (assoc data :id id)
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))

(defn delete-tenant [controller]
  (fn [{:keys [route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [result (controller {:command :delete-tenant
                                     :data    {:id id}
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))
