(ns app.controller.apartment-update-test
  "Regression tests for :update-apartment field persistence.

  These guard the core→controller→storage half of the chain that backs the
  PendingTasksWidget apartment modals (Wohnfläche, ortsübliche Vergleichsmiete,
  Leerstand). A field that isn't carried all the way through here means the task
  never clears after saving."
  (:require [clojure.test :refer [deftest is async]]
            [integrant.core :as ig]
            [app.core.system :as core-system]
            [app.storage.interface :as storage-iface]
            [app.controller.core :as controller]))

(def ^:private org-user {:org-id "org-1" :email "user@test.local" :plan "done_by_you"})

(def ^:private seed-tx
  [{:db/id "org-1" :db/type "organization" :organization/plan "done_by_you"}
   {:db/id "prop-1" :db/type "property"
    :property/organization-id "org-1" :property/name "Viehauser Berg"}
   {:db/id "apt-1" :db/type "apartment"
    :apartment/organization-id "org-1"
    :apartment/property-id     "prop-1"
    :apartment/code            "01-EG-01"}])

(defn- dispatch! [storage command data user]
  (js/Promise.resolve
   (controller/dispatch {:core (core-system/init) :storage storage :command command
                         :data data :env nil :user user})))

(defn- pull-apt [storage]
  ((:pull storage) "apt-1" '[*]))

(deftest update-apartment-persists-market-rent
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :update-apartment
                     {:id "apt-1" :market-rent 850} org-user)
          (.then (fn [res]
                   (is (nil? (:error res)))
                   (pull-apt storage)))
          (.then (fn [apt]
                   (is (= 850 (:apartment/market-rent apt))
                       "ortsübliche Vergleichsmiete must persist, else the Steuer task never clears")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest update-apartment-persists-wohnflaeche-and-leerstand
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :update-apartment
                     {:id "apt-1" :wohnflaeche 65.5} org-user)
          (.then (fn [_] (pull-apt storage)))
          (.then (fn [apt]
                   (is (= 65.5 (:apartment/wohnflaeche apt)))
                   (dispatch! storage :update-apartment
                              {:id "apt-1" :leerstand true} org-user)))
          (.then (fn [_] (pull-apt storage)))
          (.then (fn [apt]
                   (is (true? (:apartment/leerstand apt)))
                   ;; earlier field must survive a later partial update
                   (is (= 65.5 (:apartment/wohnflaeche apt))
                       "partial updates must not clobber other fields")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))

(deftest update-apartment-is-org-scoped
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :update-apartment
                     {:id "apt-1" :market-rent 999}
                     {:org-id "org-2" :email "other@test.local" :plan "done_by_you"})
          (.then (fn [res]
                   (is (= :not-found (:error res)))
                   (pull-apt storage)))
          (.then (fn [apt]
                   (is (nil? (:apartment/market-rent apt)) "other org must not write")
                   (done)))
          (.catch (fn [e] (is false (str "threw: " e)) (done)))))))
