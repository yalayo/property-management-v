(ns verify
  "Headless REPL smoke test for Phase 1/2 — storage + controller, no HumbleUI
  window involved. Run with: clj -M:dev -m verify"
  (:require [app.storage.sqlite :as storage]
            [app.desktop.controller :as controller]
            [clojure.java.io :as io]))

(defn- check [label pred]
  (println (if pred "PASS" "FAIL") "-" label)
  (when-not pred (System/exit 1)))

(defn -main [& _args]
  (let [tmp-path (.getAbsolutePath (java.io.File/createTempFile "desktop-verify" ".db"))]
    (.delete (io/file tmp-path))
    (println "Using temp db:" tmp-path)
    (let [conn   (storage/open! tmp-path)
          org-id "org-1"]

      ;; --- Phase 1: raw storage primitives -------------------------------
      (let [{:keys [tx-id entity-ids]} (storage/transact! conn [{:db/type "property"
                                                                  :property/organization-id org-id
                                                                  :property/name "Direct Test Property"
                                                                  :property/address "Test St 1"}])
            eid (first entity-ids)
            pulled (storage/pull conn eid '*)]
        (check "transact! returns tx-id + entity-ids" (and tx-id eid))
        (check "pull round-trips the property" (= "Direct Test Property" (:property/name pulled)))
        (check "find-by-attr finds it by org" (= [eid] (storage/find-by-attr conn :property/organization-id org-id))))

      ;; --- Phase 2: controller (validation + duplicate-name + org scoping) -
      (let [create-result (controller/create-property! conn org-id {:name "Musterstrasse 1" :address "Musterstrasse 1" :city "Berlin"})]
        (check "create-property! succeeds" (:property-id create-result))
        (let [dup (controller/create-property! conn org-id {:name "Musterstrasse 1" :address "elsewhere"})]
          (check "duplicate name in same org is rejected" (= :duplicate-name (:error dup))))
        (let [missing (controller/create-property! conn org-id {:address "no name given"})]
          (check "missing required field is rejected" (= :missing-required-fields (:error missing))))

        (let [pid (:property-id create-result)
              upd (controller/update-property! conn org-id {:id pid :city "Hamburg"})]
          (check "update-property! succeeds" (:tx-id upd))
          (check "update applied" (= "Hamburg" (:property/city (storage/pull conn pid '*)))))

        (let [wrong-org (controller/update-property! conn "org-2" {:id (:property-id create-result) :city "Nope"})]
          (check "update-property! rejects cross-org access" (= :not-found (:error wrong-org))))

        (let [{:keys [properties]} (controller/get-properties conn org-id)]
          (check "get-properties returns both properties" (= 2 (count properties))))

        (let [pid (:property-id create-result)
              del (controller/delete-property! conn org-id {:id pid})]
          (check "delete-property! succeeds" (:ok del))
          (check "deleted property no longer listed" (= 1 (count (:properties (controller/get-properties conn org-id))))))))

    (println "\nAll checks passed."))
  (System/exit 0))
