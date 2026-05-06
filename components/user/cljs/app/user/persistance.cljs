(ns app.user.persistance
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]))

(defn hash-password [password salt]
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

(defn create-account [storage name email password]
  (js-await [hashed (hash-password password "temporary salt")]
            (let [user-id (js/crypto.randomUUID)
                  query {:insert-into [:accounts]
                         :columns    [:user_id :product :name :email :password]
                         :values     [[user-id "props" name email hashed]]}]
              (js-await [{:keys [success results]} (storage/run+ storage query)]
                        (if success
                          {:result results}
                          (throw (js/Error. "Insert failed")))))))

(defn get-accounts [storage]
  (let [query {:select [:email :verified]
               :from   [:accounts]}]
    (js-await [{:keys [success results]} (storage/query+ storage query)]
              (if success
                results
                (throw (ex-info "DB error: get-accounts failed" {}))))))

(defn get-account [storage email]
  (let [query {:select [:*]
               :from   [:accounts]
               :where  [:= :email email]}]
    (js-await [{:keys [success results]} (storage/query+ storage query)]
              (if success
                (first results)
                (throw (ex-info "DB error: get-account failed" {}))))))
