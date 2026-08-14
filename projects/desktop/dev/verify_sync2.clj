(ns verify-sync2
  "Headless check for Phase N3/N4 — creates an apartment+tenant locally via
  app.desktop.controller, syncs via app.desktop.sync/sync! against the real
  local wrangler dev backend, and confirms they land server-side.
  Run with: clj -M:dev -m verify-sync2"
  (:require [app.storage.sqlite :as storage]
            [app.desktop.controller :as controller]
            [app.desktop.api :as api]
            [app.desktop.sync :as sync]
            [clojure.java.io :as io]))

(defn- check [label pred]
  (println (if pred "PASS" "FAIL") "-" label)
  (when-not pred (System/exit 1)))

(defn -main [& _args]
  (let [tmp-path (.getAbsolutePath (java.io.File/createTempFile "desktop-verify-sync2" ".db"))]
    (.delete (io/file tmp-path))
    (println "Using temp db:" tmp-path)
    (let [conn       (storage/open! tmp-path)
          sign-in    (api/sign-in "admin" "admin")
          jwt        (:token sign-in)
          _          (check "sign-in succeeds" jwt)
          org-id     (get-in sign-in [:user :org-id])
          {pid :property-id} (controller/create-property! conn org-id {:name (str "SyncTest-" (random-uuid)) :address "Sync Test St 1"})
          _          (check "local property created" pid)
          {aid :apartment-id} (controller/create-apartment! conn org-id {:property-id pid :code (str "SYNC-" (subs (str (random-uuid)) 0 5))})
          _          (check "local apartment created" aid)
          {tid :tenant-id} (controller/create-tenant! conn org-id {:apartment-id aid :first-name "Sync" :last-name (str "Test" (subs (str (random-uuid)) 0 5))})
          _          (check "local tenant created" tid)
          sync-result (sync/sync! conn jwt)]
      (println "sync! result:" sync-result)
      (check "sync! reports no error" (not (:error sync-result)))
      (check "sync! pushed at least 3 entities (property+apartment+tenant)" (>= (:pushed sync-result 0) 3))

      (let [server-apts (:apartments (api/get-entities jwt :get-apartments))
            server-tenants (:tenants (api/get-entities jwt :get-tenants))]
        (check "apartment landed server-side with matching id" (some #(= (:db/id %) aid) server-apts))
        (check "apartment has correct property-id server-side" (some #(and (= (:db/id %) aid) (= (:apartment/property-id %) pid)) server-apts))
        (check "tenant landed server-side with matching id" (some #(= (:db/id %) tid) server-tenants))
        (check "tenant has correct apartment-id server-side" (some #(and (= (:db/id %) tid) (= (:tenant/apartment-id %) aid)) server-tenants))))

    (println "\nAll checks passed."))
  (System/exit 0))
