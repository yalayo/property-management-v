(ns app.worker.core
  (:require [reitit.core :as r]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf :refer [defclass]]
            [app.worker.db :as db]))

(def router
  (r/router
   ["/api"
    ["/questions" ::questions]]))

;; args:
;;  route: Reitit route data
;;  request: js/Request object https://developers.cloudflare.com/workers/runtime-apis/request/
;;  env: Environment object containing env vars and bindings to Cloudflare services https://developers.cloudflare.com/workers/configuration/environment-variables/
;;  ctx: The Context API provides methods to manage the lifecycle of your Worker https://developers.cloudflare.com/workers/runtime-apis/context/
(defmulti handle-route (fn [route request env ctx]
                         [(-> route :data :name) (keyword (.-method ^js request))]))

(defmethod handle-route [::default :GET] [route request env ctx]
  nil)

(defmethod handle-route [::todos :GET] [route request env ctx]
  (js-await [{:keys [success results]} {:success true :results {:hello :world}}]
            (if success
              (cf/response-edn results {:status 200})
              (cf/response-error))))

(defmulti handle-route (fn [route request env ctx]
                         [(-> route :data :name) (keyword (.-method ^js request))]))

(defmethod handle-route [::questions :GET] [route request env ctx]
  (js-await [{:keys [success results]} (db/query+ {:select [:*]
                                                   :from   [:questions]})]
            (if success
              (cf/response-edn {:result results} {:status 200})
              (cf/response-error))))

;; entry point
(def handler
  #js {:fetch (cf/with-handler router handle-route)})