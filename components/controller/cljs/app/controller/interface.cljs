(ns app.controller.interface
  (:require [integrant.core :as ig]
            [app.worker.async :refer [js-await]]))

(defmethod ig/init-key ::controller [_ {:keys [core storage]}]
  (fn [{:keys [command data user]}]
    (js-await [eids ((:find-by-attr storage) :account/email (:email user))]
              (println "Query reult: " eids)
              (js-await [db-user (when-let [eid (first eids)]
                                   ((:pull storage) eid '*))]
                        (let [result ((:process core) {:command command
                                                       :data    data
                                                       :user    user
                                                       :db-user db-user})]
                          (if (= :create-user (:action result))
                            (js-await [_ ((:transact! storage)
                                          [{:db/type       "account"
                                            :account/email (get-in result [:user-data :email])
                                            :account/name  (get-in result [:user-data :name])}]
                                          nil)]
                                      {:ok true})
                            result))))))
