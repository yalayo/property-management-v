(ns app.worker.handler
  (:require
   [app.worker.async :refer [js-await]]
   [app.worker.cf :as cf]))

(defn command
  "Returns a Reitit route handler that delegates to the controller.
  Called once at Integrant init time."
  [_core _storage controller]
  (fn [{:keys [request env user]}]
    (js-await [body (cf/request->edn request)]
              (let [{:keys [command data]} body]
                (js-await [result (controller {:command command :data data :user user})]
                          (if (:error result)
                            (cf/response-edn result {:status 400})
                            (cf/response-edn result {:status 201})))))))