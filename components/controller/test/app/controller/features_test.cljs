(ns app.controller.features-test
  "Unit + property tests for the pure feature-flag logic."
  (:require [clojure.test :refer [deftest is testing]]
            [clojure.test.check.generators :as gen]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]
            [app.controller.features :as features]))

;; ─── Deterministic unit tests ─────────────────────────────────────────────────

(deftest feature-effective-truth-table
  (let [f (fn [enabled default] {:feature/key "x" :feature/enabled enabled :feature/default-on default})
        ov (fn [v] {:feature-override/feature-key "x" :feature-override/enabled v})]
    (testing "master switch off ⇒ always off"
      (is (false? (features/feature-effective? (f false true)  nil)))
      (is (false? (features/feature-effective? (f false true)  (ov true))))
      (is (false? (features/feature-effective? (f false false) (ov true)))))
    (testing "master on, no override ⇒ default decides"
      (is (true?  (features/feature-effective? (f true true)  nil)))
      (is (false? (features/feature-effective? (f true false) nil))))
    (testing "master on, override wins over default"
      (is (false? (features/feature-effective? (f true true)  (ov false))))
      (is (true?  (features/feature-effective? (f true false) (ov true)))))))

(deftest feature-blocked-missing-data-is-open
  (testing "unseeded catalog can never lock anyone out"
    (is (false? (features/feature-blocked? nil nil)))
    (is (false? (features/feature-blocked? nil {:feature-override/enabled false})))))

(deftest resolve-enabled-basic
  (let [fs  [{:feature/key "a" :feature/enabled true  :feature/default-on true}
             {:feature/key "b" :feature/enabled true  :feature/default-on false}
             {:feature/key "c" :feature/enabled false :feature/default-on true}]
        ovs [{:feature-override/feature-key "b" :feature-override/enabled true}
             {:feature-override/feature-key "c" :feature-override/enabled true}]]
    (is (= #{"a" "b"} (set (features/resolve-enabled fs ovs)))
        "b flipped on by override; c stays off because master switch dominates")))

(deftest command-mapping-points-at-canonical-features
  (testing "every gated command maps to a key present in the canonical catalog"
    (let [known (set (map :key features/canonical-features))]
      (doseq [[cmd fkey] features/command->feature]
        (is (contains? known fkey)
            (str cmd " maps to unknown feature " fkey))))))

(deftest canonical-catalog-shape
  (testing "canonical features are unique and fully described"
    (let [ks (map :key features/canonical-features)]
      (is (= (count ks) (count (distinct ks))) "keys must be unique")
      (is (every? #(and (string? (:key %)) (string? (:name %))
                        (contains? #{"section" "module"} (:category %)))
                  features/canonical-features)))))

;; ─── Property tests ───────────────────────────────────────────────────────────

(def gen-override (gen/one-of [(gen/return nil) gen/boolean]))

(defspec master-switch-dominates-and-override-wins 200
  (prop/for-all [enabled  gen/boolean
                 default  gen/boolean
                 override gen-override]
    (let [f   {:feature/key "x" :feature/enabled enabled :feature/default-on default}
          ov  (when (some? override)
                {:feature-override/feature-key "x" :feature-override/enabled override})
          eff (features/feature-effective? f ov)]
      (cond
        (not enabled)     (false? eff)
        (some? override)  (= eff override)
        :else             (= eff default)))))

(defspec resolve-enabled-agrees-with-pointwise-resolution 100
  (prop/for-all [flags (gen/vector (gen/tuple gen/boolean gen/boolean gen-override) 1 10)]
    (let [feats (vec (map-indexed
                      (fn [i [en df _]]
                        {:feature/key (str "f" i) :feature/enabled en :feature/default-on df})
                      flags))
          ovs   (vec (keep-indexed
                      (fn [i [_ _ ov]]
                        (when (some? ov)
                          {:feature-override/feature-key (str "f" i)
                           :feature-override/enabled     ov}))
                      flags))
          enabled (set (features/resolve-enabled feats ovs))]
      (every? (fn [[i [en df ov]]]
                (let [k        (str "f" i)
                      expected (and en (if (some? ov) ov df))]
                  (= (contains? enabled k) (boolean expected))))
              (map-indexed vector flags)))))

(defspec blocked-iff-not-effective 100
  (prop/for-all [enabled  gen/boolean
                 default  gen/boolean
                 override gen-override]
    (let [f  {:feature/key "x" :feature/enabled enabled :feature/default-on default}
          ov (when (some? override)
               {:feature-override/feature-key "x" :feature-override/enabled override})]
      (= (features/feature-blocked? f ov)
         (not (features/feature-effective? f ov))))))
