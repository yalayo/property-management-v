(ns app.apartment.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-apartments [controller]
  (fn [{:keys [_request _env user]}]
    (js-await [result (controller {:command :get-apartments :user user})]
              (cf/response-edn result {:status 200}))))

(defn get-apartments-by-property [controller]
  (fn [{:keys [_request _env route user]}]
    (let [property-id (-> route :path-params :property-id)]
      (js-await [result (controller {:command :get-apartments-by-property
                                     :data    {:property-id property-id}
                                     :user    user})]
                (cf/response-edn result {:status 200})))))

(defn create-apartment [controller]
  (fn [{:keys [request _env user]}]
    (js-await [data   (cf/request->edn request)
               result (controller {:command :create-apartment :data data :user user})]
              (if (:error result)
                (cf/response-edn result {:status 400})
                (cf/response-edn result {:status 201})))))

(defn update-apartment [controller]
  (fn [{:keys [request route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [data   (cf/request->edn request)
                 result (controller {:command :update-apartment
                                     :data    (assoc data :id id)
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))

(defn delete-apartment [controller]
  (fn [{:keys [route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [result (controller {:command :delete-apartment
                                     :data    {:id id}
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))

(defn get-all-onboardings [controller]
  (fn [{:keys [_request _env user]}]
    (js-await [result (controller {:command :get-onboardings :user user})]
              (cf/response-edn result {:status 200}))))

(defn get-onboarding [controller]
  (fn [{:keys [route _env user]}]
    (let [apartment-id (-> route :path-params :id)]
      (js-await [result (controller {:command :get-onboarding
                                     :data    {:apartment-id apartment-id}
                                     :user    user})]
                (cf/response-edn result {:status 200})))))

(defn start-onboarding [controller]
  (fn [{:keys [request route _env user]}]
    (let [apartment-id (-> route :path-params :id)]
      (js-await [data   (cf/request->edn request)
                 result (controller {:command :start-onboarding
                                     :data    (assoc data :apartment-id apartment-id)
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 400})
                  (cf/response-edn result {:status 201}))))))
