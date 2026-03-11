(ns app.web.events
  (:require [re-frame.core :as re-frame]
            [cljs.reader]
            [app.web.db :as db]
            [app.web.interceptors :refer [->local-store]]
            [day8.re-frame.tracing :refer-macros [fn-traced]]
            [day8.re-frame.http-fx]
            [app.web.config :as config]))

;; Interceptor Chain
(def interceptors [->local-store])

;; To restore db from the browser's local storage
(re-frame/reg-cofx
 :local-store-db
 (fn [cofx _]
   (assoc cofx :local-store-db
          (into (sorted-map)
                (some->> (.getItem js/localStorage db/ls-key)
                         (cljs.reader/read-string))))))

(re-frame/reg-event-fx
 ::initialize-db
 [(re-frame/inject-cofx :local-store-db)]
 (fn [{:keys [local-store-db]} _]
   {:db (merge db/default-db local-store-db)}))
