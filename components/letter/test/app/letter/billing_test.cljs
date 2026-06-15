(ns app.letter.billing-test
  (:require [clojure.test :refer [deftest is testing]]
            [app.letter.billing :as billing]))

(deftest check-readiness-all-met-test
  (testing "returns ready when all conditions are true"
    (let [result (billing/check-readiness
                  {:has-tenant?    true
                   :has-all-costs? true
                   :has-payments?  true
                   :has-iban?      true})]
      (is (true?  (:ready? result)))
      (is (empty? (:missing result))))))

(deftest check-readiness-missing-tenant-test
  (testing "reports :tenant as missing when no tenant"
    (let [result (billing/check-readiness
                  {:has-tenant?    false
                   :has-all-costs? true
                   :has-payments?  true
                   :has-iban?      true})]
      (is (false? (:ready? result)))
      (is (contains? (:missing result) :tenant)))))

(deftest check-readiness-missing-costs-test
  (testing "reports :costs as missing when not all costs set"
    (let [result (billing/check-readiness
                  {:has-tenant?    true
                   :has-all-costs? false
                   :has-payments?  true
                   :has-iban?      true})]
      (is (false? (:ready? result)))
      (is (contains? (:missing result) :costs)))))

(deftest check-readiness-missing-iban-test
  (testing "reports :iban as missing"
    (let [result (billing/check-readiness
                  {:has-tenant?    true
                   :has-all-costs? true
                   :has-payments?  true
                   :has-iban?      false})]
      (is (false? (:ready? result)))
      (is (contains? (:missing result) :iban)))))

(deftest check-readiness-all-missing-test
  (testing "reports all four items as missing when nothing is set"
    (let [result (billing/check-readiness
                  {:has-tenant?    false
                   :has-all-costs? false
                   :has-payments?  false
                   :has-iban?      false})]
      (is (false? (:ready? result)))
      (is (= #{:tenant :costs :payments :iban} (:missing result)))))

  (testing "missing set has exactly the right cardinality"
    (let [result (billing/check-readiness
                  {:has-tenant?    false
                   :has-all-costs? false
                   :has-payments?  false
                   :has-iban?      false})]
      (is (= 4 (count (:missing result)))))))

(deftest check-readiness-partial-missing-test
  (testing "correctly tracks two missing items"
    (let [result (billing/check-readiness
                  {:has-tenant?    true
                   :has-all-costs? false
                   :has-payments?  false
                   :has-iban?      true})]
      (is (false? (:ready? result)))
      (is (= #{:costs :payments} (:missing result))))))
