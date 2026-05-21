(ns app.property.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-properties [controller]
  (fn [{:keys [_request _env user]}]
    (js-await [result (controller {:command :get-properties :user user})]
              (cf/response-edn result {:status 200}))))

(defn create-property [controller]
  (fn [{:keys [request _env user]}]
    (js-await [data   (cf/request->edn request)
               result (controller {:command :create-property :data data :user user})]
              (if (:error result)
                (cf/response-edn result {:status 400})
                (cf/response-edn result {:status 201})))))

(defn update-property [controller]
  (fn [{:keys [request route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [data   (cf/request->edn request)
                 result (controller {:command :update-property
                                     :data    (assoc data :id id)
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))

(defn delete-property [controller]
  (fn [{:keys [route _env user]}]
    (let [id (-> route :path-params :id)]
      (js-await [result (controller {:command :delete-property
                                     :data    {:id id}
                                     :user    user})]
                (if (:error result)
                  (cf/response-edn result {:status 404})
                  (cf/response-edn result {:status 200}))))))
