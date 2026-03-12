(ns app.user.persistance
  (:require [app.worker.db :as db]            ;; your db wrapper
            [honey.sql :as sql]
            [honey.sql.helpers :as h]
            [app.worker.cf :as cf]
            [app.worker.async :refer [js-await]]))

;; Wrap bcrypt.hash in a Promise so we can await it
(defn hash-password
  [password salt]
  (let [input (str salt ":" password)
        encoder (js/TextEncoder.)
        data (.encode encoder input)]
    (-> (js/Promise.resolve
         (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b]
                               (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))

(defn ^:export create-account [env name email password]
  (js-await [hashed (hash-password password "temporary salt")]
            (let [user-id (js/crypto.randomUUID)
                  query {:insert-into [:accounts]
                         :columns    [:user_id :product :name :email :password]
                         :values     [[user-id "props" name email hashed]]}]
              (js-await [{:keys [success results]} (db/run+ env query)]
                        (if success
                          {:result results}
                          (throw (js/Error. "Insert failed")))))))

(defn get-accounts []
  (let [query {:select [:email :verified]
               :from   [:accounts]}]
    (js-await [{:keys [success results]} (db/run+ nil query)] 
              (if success
                results
                (throw (ex-info "DB error: get-accounts failed" {}))))))

(defn jsobj->cljmap [o]
  (into {}
        (map (fn [k] [(keyword k) (aget o k)]))
        (js/Object.keys o)))

(defn get-account [email]
  (let [query {:select [:*]
               :from   [:accounts]
               :where  [:= :email email]}]
    (js-await [{:keys [success results]} (db/query+ query)]
              (if success
                ;; results is a JS array of maps → return the **first** row as CLJS map
                (first results)
                (throw (ex-info "DB error: get-account failed" {}))))))