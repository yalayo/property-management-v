(ns app.controller.core
  (:require [app.worker.async :refer [js-await]]))

(defn- hash-password [password salt]
  (let [input   (str salt ":" password)
        encoder (js/TextEncoder.)
        data    (.encode encoder input)]
    (-> (js/Promise.resolve (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [^js hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b] (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))

(defn dispatch [{:keys [core storage command data user env]}]
  (js-await [eids ((:find-by-attr storage) :account/email (get data :email))]
            (println "Query result: " eids)
            (js-await [db-user (when-let [eid (first eids)]
                                 ((:pull storage) eid '*))]
                      (let [result ((:process core) {:command command
                                                     :data    data
                                                     :user    user
                                                     :db-user db-user})]
                        (if (= :create-user (:action result))
                          (js-await [hashed (hash-password (get-in result [:user-data :password])
                                                           (aget env "JWT_SECRET"))]
                                    (js-await [_ ((:transact! storage)
                                                  [{:db/type          "account"
                                                    :account/email    (get-in result [:user-data :email])
                                                    :account/name     (get-in result [:user-data :name])
                                                    :account/password hashed
                                                    :account/verified false}]
                                                  nil)]
                                              {:ok true}))
                          result)))))
