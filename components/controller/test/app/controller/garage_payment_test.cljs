(ns app.controller.garage-payment-test
  "Integration tests for the garage-payment entity, driven through the real
  controller/dispatch against the in-memory storage."
  (:require [clojure.test :refer [deftest is async]]
            [integrant.core :as ig]
            [app.storage.interface :as storage-iface]
            [app.controller.core :as controller]))

(def ^:private org-user       {:org-id "org-1" :email "user@test.local" :plan "done_by_you"})
(def ^:private other-org-user {:org-id "org-2" :email "other@test.local" :plan "done_by_you"})

(def ^:private seed-tx
  [{:db/id "org-1" :db/type "organization" :organization/plan "done_by_you"}
   {:db/id "org-2" :db/type "organization" :organization/plan "done_by_you"}
   {:db/id "prop-1" :db/type "property"
    :property/organization-id "org-1" :property/name "Viehauser Berg"}
   {:db/id "gar-1" :db/type "garage"
    :garage/organization-id "org-1"
    :garage/property-id     "prop-1"
    :garage/code            "G1"
    :garage/monthly-rent    75
    :garage/occupied        true}])

(defn- dispatch!
  "dispatch returns a promise for async handlers but a plain map for synchronous
  guard/validation errors — normalise to a promise."
  [storage command data user]
  (js/Promise.resolve
   (controller/dispatch {:core nil :storage storage :command command
                         :data data :env nil :user user})))

(deftest create-and-list-garage-payments
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :create-garage-payment
                     {:garage-id "gar-1" :year 2026 :month 3 :value 75} org-user)
          (.then (fn [res]
                   (is (some? (:garage-payment-id res)) "payment created")
                   (dispatch! storage :get-all-garage-payments {} org-user)))
          (.then (fn [{:keys [garage-payments]}]
                   (is (= 1 (count garage-payments)))
                   (let [p (first garage-payments)]
                     (is (= "gar-1" (:garage-payment/garage-id p)))
                     (is (= 2026 (:garage-payment/year p)))
                     (is (= 3 (:garage-payment/month p)))
                     (is (= 75 (:garage-payment/value p))))
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest garage-payments-are-org-scoped
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :create-garage-payment
                     {:garage-id "gar-1" :year 2026 :month 3 :value 75} org-user)
          ;; another org must not see it …
          (.then (fn [_] (dispatch! storage :get-all-garage-payments {} other-org-user)))
          (.then (fn [{:keys [garage-payments]}]
                   (is (empty? garage-payments) "other org sees no payments")
                   ;; … nor create one against a garage it does not own
                   (dispatch! storage :create-garage-payment
                              {:garage-id "gar-1" :year 2026 :month 4 :value 75}
                              other-org-user)))
          (.then (fn [res]
                   (is (= :not-found (:error res))
                       "cannot record a payment for another org's garage")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest delete-garage-payment
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :create-garage-payment
                     {:garage-id "gar-1" :year 2026 :month 5 :value 75} org-user)
          (.then (fn [res] (dispatch! storage :delete-garage-payment
                                      {:id (:garage-payment-id res)} org-user)))
          (.then (fn [res]
                   (is (:ok res))
                   (dispatch! storage :get-all-garage-payments {} org-user)))
          (.then (fn [{:keys [garage-payments]}]
                   (is (empty? garage-payments) "payment removed")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))
