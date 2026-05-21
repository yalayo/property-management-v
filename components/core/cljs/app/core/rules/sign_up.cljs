(ns app.core.rules.sign-up
  (:require [odoyle.rules :as o]))

(def ^:private rules
  (o/ruleset
   {::create-user
    [:what
     [::signup :signup/email    email]
     [::signup :signup/name     name]
     [::signup :signup/password password]
     [::signup :signup/user-exists? false]
     :then
     (o/insert! ::result ::outcome
                {:action    :create-account-with-org
                 :user-data {:email    email
                             :name     name
                             :password password}})]

    ::user-exists
    [:what
     [::signup :signup/user-exists? true]
     :then
     (o/insert! ::result ::outcome
                {:error :user-already-exists})]

    ::outcome
    [:what
     [::result ::outcome result]]}))

(defn- new-session []
  (reduce o/add-rule (o/->session) rules))

(defn validate [{:keys [email name password db-user]}]
  (let [session (-> (new-session)
                    (o/insert ::signup :signup/email       email)
                    (o/insert ::signup :signup/name        name)
                    (o/insert ::signup :signup/password    password)
                    (o/insert ::signup :signup/user-exists? (some? db-user))
                    o/fire-rules)]
    (:result (first (o/query-all session ::outcome)))))
