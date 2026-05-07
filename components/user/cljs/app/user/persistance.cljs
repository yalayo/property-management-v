(ns app.user.persistance
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]))

(defn hash-password [password salt]
  (let [input   (str salt ":" password)
        encoder (js/TextEncoder.)
        data    (.encode encoder input)]
    (-> (js/Promise.resolve (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [^js hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b] (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))

(defn create-account [name email password]
  (js-await [hashed (hash-password password "temporary salt")]
            (storage/transact!
             [{:db/type          "account"
               :account/product  "props"
               :account/name     name
               :account/email    email
               :account/password hashed
               :account/verified false}])))

(defn get-accounts []
  (js-await [eids (storage/find-by-type "account")]
            (storage/pull-many eids [:account/email :account/verified])))

(defn get-account [email]
  (js-await [eids (storage/find-by-attr :account/email email)]
            (when-let [eid (first eids)]
              (storage/entity eid))))
