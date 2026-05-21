(ns app.user.handler
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn post-sign-in [controller]
  (fn [{:keys [request env]}]
    (js-await [data   (cf/request->edn request)
               result (controller {:command :user-sign-in :data data :env env})]
              (if (:error result)
                (cf/response-edn result {:status 401})
                (cf/response-edn result {:status 200})))))

(defn post-sign-up [controller]
  (fn [{:keys [request env]}]
    (js-await [data   (cf/request->edn request)
               result (controller {:command :user-sign-up :data data :env env})]
              (if (:error result)
                (cf/response-edn result {:status 400})
                (cf/response-edn result {:status 201})))))
