(ns app.controller.admin-password-test
  "Integration tests for the super-admin password-reset command, driven through
  the real controller/dispatch against the in-memory storage."
  (:require [clojure.test :refer [deftest is async]]
            [integrant.core :as ig]
            [app.storage.interface :as storage-iface]
            [app.controller.core :as controller]))

(def ^:private test-env #js {"JWT_SECRET" "test-secret-123"})
(def ^:private super-admin {:superadmin true :email "admin@test.local"})

(def ^:private seed-tx
  [{:db/id "acc-1" :db/type "account"
    :account/email    "user@test.local"
    :account/name     "User"
    :account/password "ORIGINAL-HASH"}
   {:db/id "org-1" :db/type "organization"}
   {:db/id "mem-1" :db/type "membership"
    :membership/account-id      "acc-1"
    :membership/organization-id "org-1"
    :membership/role            "admin"}])

(defn- dispatch!
  "dispatch may return either a promise (async handlers) or a plain map
  (synchronous validation/guard errors), so normalise to a promise."
  [storage command data user]
  (js/Promise.resolve
   (controller/dispatch {:core nil :storage storage :command command
                         :data data :env test-env :user user})))

(defn- stored-password [storage]
  (-> ((:find-by-attr storage) :account/email "user@test.local")
      (.then (fn [eids] ((:pull storage) (first eids) '[*])))
      (.then (fn [acc] (:account/password acc)))))

(deftest admin-set-password-updates-hash
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :admin-set-password
                     {:email "user@test.local" :password "newsecret123"} super-admin)
          (.then (fn [res] (is (:ok res)) (stored-password storage)))
          (.then (fn [hash]
                   (is (string? hash))
                   (is (not= "ORIGINAL-HASH" hash) "hash must change")
                   (is (re-matches #"[0-9a-f]{64}" hash) "SHA-256 hex digest")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest admin-set-password-rejects-short-password
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :admin-set-password
                     {:email "user@test.local" :password "short"} super-admin)
          (.then (fn [res]
                   (is (= :password-too-short (:error res)))
                   (stored-password storage)))
          (.then (fn [hash]
                   (is (= "ORIGINAL-HASH" hash) "password unchanged when rejected")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest admin-set-password-requires-superadmin
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :admin-set-password
                     {:email "user@test.local" :password "newsecret123"}
                     {:org-id "org-1" :email "user@test.local"})  ; not a super admin
          (.then (fn [res]
                   (is (= :forbidden (:error res)))
                   (stored-password storage)))
          (.then (fn [hash]
                   (is (= "ORIGINAL-HASH" hash) "non-superadmin cannot change passwords")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest admin-set-password-unknown-user
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :admin-set-password
                     {:email "nobody@test.local" :password "newsecret123"} super-admin)
          (.then (fn [res] (is (= :not-found (:error res))) (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))
