(ns app.controller.core
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]))

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

(defn- handle-sign-up! [core storage data env db-user]
  (let [result ((:process core) {:command :user-sign-up
                                 :data    data
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
      result)))

(defn- handle-sign-in! [core data env db-user]
  (js-await [provided-hash (hash-password (get data :password) (aget env "JWT_SECRET"))]
            (let [result ((:process core) {:command       :user-sign-in
                                           :data          data
                                           :db-user       db-user
                                           :provided-hash provided-hash})]
              (if (= :sign-in-ok (:action result))
                (let [claims #js {:email (get-in result [:user :email])
                                  :exp   (+ (js/Math.floor (/ (.now js/Date) 1000)) 86400)}
                      token  (jwt/sign claims (aget env "JWT_SECRET"))]
                  {:token token :user (:user result)})
                result))))

(defn- extract-email [data]
  (or (get data :email) (get data :user)))

(defn dispatch [{:keys [core storage command data env]}]
  (js-await [eids ((:find-by-attr storage) :account/email (extract-email data))]
            (println "Query result: " eids)
            (js-await [db-user (when-let [eid (first eids)]
                                 ((:pull storage) eid '*))]
                      (case command
                        :user-sign-up (handle-sign-up! core storage data env db-user)
                        :user-sign-in (handle-sign-in! core data env db-user)
                        {:error :unknown-command}))))
