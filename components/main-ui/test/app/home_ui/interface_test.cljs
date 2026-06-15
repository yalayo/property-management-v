(ns app.home-ui.interface-test
  (:require [clojure.test :refer [deftest is testing]]))

;; ---------------------------------------------------------------------------
;; Pure handler functions extracted for testing.
;; These mirror the logic in app.main-ui.events without needing re-frame.
;; ---------------------------------------------------------------------------

(defn- set-dashboard-tab [db [_ tab]]
  (assoc-in db [:ui :dashboard-tab] tab))

(defn- navigate-to-apartments [db [_ property]]
  (assoc-in db [:ui :selected-property] property))

(defn- set-property-filter [db [_ property]]
  (assoc-in db [:apartments :property-filter] property))

;; ---------------------------------------------------------------------------
;; Tests
;; ---------------------------------------------------------------------------

(deftest set-dashboard-tab-test
  (testing "stores the tab name in the app db"
    (let [result (set-dashboard-tab {} [nil "apartments"])]
      (is (= "apartments" (get-in result [:ui :dashboard-tab])))))

  (testing "overwrites a previous tab selection"
    (let [db     (set-dashboard-tab {} [nil "properties"])
          result (set-dashboard-tab db [nil "tenants"])]
      (is (= "tenants" (get-in result [:ui :dashboard-tab])))))

  (testing "overview is a valid tab"
    (is (= "overview" (get-in (set-dashboard-tab {} [nil "overview"]) [:ui :dashboard-tab])))))

(deftest navigate-to-apartments-test
  (testing "stores selected property in db"
    (let [property {:id 1 :name "Musterstr. 1"}
          result   (navigate-to-apartments {} [nil property])]
      (is (= property (get-in result [:ui :selected-property])))))

  (testing "overwrites previously selected property"
    (let [first-prop  {:id 1 :name "First"}
          second-prop {:id 2 :name "Second"}
          db           (navigate-to-apartments {} [nil first-prop])
          result       (navigate-to-apartments db [nil second-prop])]
      (is (= second-prop (get-in result [:ui :selected-property])))))

  (testing "nil property clears the selection"
    (let [db     (navigate-to-apartments {} [nil {:id 1}])
          result (navigate-to-apartments db [nil nil])]
      (is (nil? (get-in result [:ui :selected-property]))))))

(deftest set-property-filter-test
  (testing "stores property filter in apartments slice"
    (let [property {:id 10 :name "Test Haus"}
          result   (set-property-filter {} [nil property])]
      (is (= property (get-in result [:apartments :property-filter])))))

  (testing "nil clears the filter"
    (let [db     (set-property-filter {} [nil {:id 5}])
          result (set-property-filter db [nil nil])]
      (is (nil? (get-in result [:apartments :property-filter])))))

  (testing "replacing filter with a different property"
    (let [db     (set-property-filter {} [nil {:id 1}])
          result (set-property-filter db [nil {:id 2 :name "Other"}])]
      (is (= 2 (:id (get-in result [:apartments :property-filter])))))))
