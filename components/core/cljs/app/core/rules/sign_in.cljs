(ns app.core.rules.sign-in
  (:require [odoyle.rules :as o]))

(def ^:private rules
  (o/ruleset
   {::user-not-found
    [:what
     [::sign-in :sign-in/user-found? false]
     :then
     (o/insert! ::result ::outcome {:error :invalid-credentials})]

    ::password-match
    [:what
     [::sign-in :sign-in/user-found?   true]
     [::sign-in :sign-in/user-id       user-id]
     [::sign-in :sign-in/user-name     user-name]
     [::sign-in :sign-in/email         email]
     [::sign-in :sign-in/provided-hash provided]
     [::sign-in :sign-in/stored-hash   stored]
     :when (= provided stored)
     :then
     (o/insert! ::result ::outcome
                {:action :sign-in-ok
                 :user   {:id    user-id
                          :name  user-name
                          :email email}})]

    ::password-mismatch
    [:what
     [::sign-in :sign-in/user-found?   true]
     [::sign-in :sign-in/provided-hash provided]
     [::sign-in :sign-in/stored-hash   stored]
     :when (not= provided stored)
     :then
     (o/insert! ::result ::outcome {:error :invalid-credentials})]

    ::outcome
    [:what
     [::result ::outcome result]]}))

(defn- new-session []
  (reduce o/add-rule (o/->session) rules))

(defn validate [{:keys [db-user provided-hash]}]
  (let [session (-> (new-session)
                    (o/insert ::sign-in :sign-in/user-found?   (some? db-user))
                    (o/insert ::sign-in :sign-in/provided-hash provided-hash))
        session (if db-user
                  (-> session
                      (o/insert ::sign-in :sign-in/user-id     (:db/id db-user))
                      (o/insert ::sign-in :sign-in/user-name   (:account/name db-user))
                      (o/insert ::sign-in :sign-in/email       (:account/email db-user))
                      (o/insert ::sign-in :sign-in/stored-hash (:account/password db-user)))
                  session)]
    (:result (first (o/query-all (o/fire-rules session) ::outcome)))))
