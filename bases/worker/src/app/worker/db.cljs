(ns app.worker.db
  (:require [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]
            [honey.sql :as sql]))

;; D1 docs https://developers.cloudflare.com/d1/

(defn ^js/Promise query+ [query-map]
  (let [[sql & params] (sql/format query-map)
        stmt (.prepare ^js @cf/DB sql)]
    (js-await [result (.all (.apply (.-bind stmt) stmt (into-array params)))]
              {:success true :results (js->clj (.-results result) :keywordize-keys true)})))

(defn ^:export run+ [^js env query]
  (let [[sql & params] (sql/format query)
        stmt (.prepare (.-DB env) sql)]
    (js-await [result (.run (.apply (.-bind stmt) stmt (into-array params)))]
              (js->clj result :keywordize-keys true))))