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
          (check "deleted property no longer listed" (= 1 (count (:properties (controller/get-properties conn org-id)))))))

      ;; --- Phase S: full Stammdaten field coverage (PropertyDetail.tsx parity) -
      (let [{pid :property-id} (controller/create-property! conn org-id {:name "Viehauser Berg" :address "Viehauser Berg 67"})
            full-update {:id pid :city "Essen" :postal-code "45239" :country "Germany" :units 3
                         :purchase-price nil :land-value 1200000.0 :building-value 3000000.0
                         :current-value nil :acquisition-date "2020-01-21" :year-built 1960
                         :ownership-share 9.5 :living-area-m2 nil :rental-area-m2 nil :usage "full-rental"}
            upd (controller/update-property! conn org-id full-update)
            saved (storage/pull conn pid '*)]
        (check "full Stammdaten update succeeds" (:tx-id upd))
        (check "city saved" (= "Essen" (:property/city saved)))
        (check "postal-code saved" (= "45239" (:property/postal-code saved)))
        (check "units saved" (= 3 (long (:property/units saved))))
        (check "land-value saved" (= 1200000.0 (:property/land-value saved)))
        (check "building-value saved" (= 3000000.0 (:property/building-value saved)))
        (check "acquisition-date saved" (= "2020-01-21" (:property/acquisition-date saved)))
        (check "year-built saved" (= 1960 (long (:property/year-built saved))))
        (check "ownership-share saved" (= 9.5 (:property/ownership-share saved)))
        (check "usage saved" (= "full-rental" (:property/usage saved))))

      ;; --- Phase N3: Apartment CRUD ---------------------------------------
      (let [{pid :property-id} (controller/create-property! conn org-id {:name "Apt-Test-Property" :address "Apt St 1"})
            create-result (controller/create-apartment! conn org-id {:property-id pid :code "01-EG-01" :wohnflaeche 65.5})]
        (check "create-apartment! succeeds" (:apartment-id create-result))
        (let [dup (controller/create-apartment! conn org-id {:property-id pid :code "01-EG-01"})]
          (check "duplicate apartment code on same property is rejected" (= :duplicate-code (:error dup))))
        (let [missing (controller/create-apartment! conn org-id {:property-id pid})]
          (check "missing apartment code is rejected" (= :missing-required-fields (:error missing))))

        (let [aid (:apartment-id create-result)
              upd (controller/update-apartment! conn org-id {:id aid :wohnflaeche 70.0})]
          (check "update-apartment! succeeds" (:tx-id upd))
          (check "wohnflaeche update applied" (= 70.0 (:apartment/wohnflaeche (storage/pull conn aid '*)))))

        (let [wrong-org (controller/update-apartment! conn "org-2" {:id (:apartment-id create-result) :code "X"})]
          (check "update-apartment! rejects cross-org access" (= :not-found (:error wrong-org))))

        (check "get-apartments returns it" (= 1 (count (:apartments (controller/get-apartments conn org-id)))))

        (let [aid (:apartment-id create-result)
              del (controller/delete-apartment! conn org-id {:id aid})]
          (check "delete-apartment! succeeds" (:ok del))
          (check "deleted apartment no longer listed" (empty? (:apartments (controller/get-apartments conn org-id))))))

      ;; --- Phase N4: Tenant CRUD -------------------------------------------
      (let [{pid :property-id} (controller/create-property! conn org-id {:name "Tenant-Test-Property" :address "Tenant St 1"})
            {aid :apartment-id} (controller/create-apartment! conn org-id {:property-id pid :code "T-01"})
            create-result (controller/create-tenant! conn org-id {:apartment-id aid :first-name "Max" :last-name "Mustermann"
                                                                    :start-date "2025-01-01"})]
        (check "create-tenant! succeeds" (:tenant-id create-result))
        (let [dup (controller/create-tenant! conn org-id {:first-name "Max" :last-name "Mustermann"})]
          (check "duplicate name org-wide is rejected" (= :duplicate-name (:error dup))))
        (let [overlap (controller/create-tenant! conn org-id {:apartment-id aid :first-name "Erika" :last-name "Musterfrau"
                                                                :start-date "2025-06-01"})]
          (check "overlapping tenancy on same apartment is rejected" (= :date-overlap (:error overlap))))
        (let [missing (controller/create-tenant! conn org-id {:apartment-id aid})]
          (check "missing tenant last-name is rejected" (= :missing-required-fields (:error missing))))

        (let [tid (:tenant-id create-result)
              upd (controller/update-tenant! conn org-id {:id tid :email "max@example.com"})]
          (check "update-tenant! succeeds" (:tx-id upd))
          (check "email update applied" (= "max@example.com" (:tenant/email (storage/pull conn tid '*)))))

        (let [wrong-org (controller/update-tenant! conn "org-2" {:id (:tenant-id create-result) :email "x"})]
          (check "update-tenant! rejects cross-org access" (= :not-found (:error wrong-org))))

        (check "get-tenants returns it" (= 1 (count (:tenants (controller/get-tenants conn org-id)))))

        (let [tid (:tenant-id create-result)
              del (controller/delete-tenant! conn org-id {:id tid})]
          (check "delete-tenant! succeeds" (:ok del))
          (check "deleted tenant no longer listed" (empty? (:tenants (controller/get-tenants conn org-id)))))))

    (println "\nAll checks passed."))
  (System/exit 0))
