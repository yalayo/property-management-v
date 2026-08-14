(ns verify-nav
  "Headless check for Phase N1 — odoyle-rules navigation session.
  Run with: clj -M:dev -m verify-nav"
  (:require [app.desktop.nav :as nav]))

(defn- check [label pred]
  (println (if pred "PASS" "FAIL") "-" label)
  (when-not pred (System/exit 1)))

(defn -main [& _args]
  (let [s0 (nav/new-session)]
    (check "fresh session starts at :login" (= :login (nav/current-section s0)))
    (check "fresh session defaults to :overview tab" (= :overview (nav/current-tab s0)))

    (let [s1 (nav/set-authenticated s0 true)]
      (check "authenticating flips section to :dashboard" (= :dashboard (nav/current-section s1)))
      (check "authenticating doesn't touch active-tab" (= :overview (nav/current-tab s1)))

      (let [s2 (nav/set-active-tab s1 :apartments)]
        (check "set-active-tab updates the tab" (= :apartments (nav/current-tab s2)))
        (check "changing tab doesn't affect section" (= :dashboard (nav/current-section s2)))

        (let [s3 (nav/set-authenticated s2 false)]
          (check "logging out flips section back to :login" (= :login (nav/current-section s3)))
          (check "logging out preserves the last active tab" (= :apartments (nav/current-tab s3)))

          (let [s4 (nav/set-authenticated s3 true)]
            (check "logging back in returns to :dashboard" (= :dashboard (nav/current-section s4)))
            (check "logging back in keeps the tab that was open before" (= :apartments (nav/current-tab s4)))))))

    (check "all-tabs has 14 entries" (= 14 (count nav/all-tabs)))
    (check "all-tabs ids are unique" (= 14 (count (set (map :id nav/all-tabs)))))
    (check ":overview/:properties/:apartments/:tenants are implemented"
           (every? :implemented? (filter #(#{:overview :properties :apartments :tenants} (:id %)) nav/all-tabs)))

    (println "\nAll checks passed."))
  (System/exit 0))
