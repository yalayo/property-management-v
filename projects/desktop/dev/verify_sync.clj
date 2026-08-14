(ns verify-sync
  "Headless check for Phase S1 — pulls reference data from the real local
  wrangler dev backend into a fresh temp db and prints entity counts.
  Run with: clj -M:dev -m verify-sync"
  (:require [app.storage.sqlite :as storage]
            [app.desktop.api :as api]
            [app.desktop.sync :as sync]
            [clojure.java.io :as io]))

(defn -main [& _args]
  (let [tmp-path (.getAbsolutePath (java.io.File/createTempFile "desktop-verify-sync" ".db"))]
    (.delete (io/file tmp-path))
    (println "Using temp db:" tmp-path)
    (let [conn        (storage/open! tmp-path)
          sign-in     (api/sign-in "admin" "admin")
          _           (println "sign-in result keys:" (keys sign-in))
          jwt         (:token sign-in)
          sync-result (sync/sync! conn jwt)]
      (println "sync! result:" sync-result)
      (doseq [etype ["property" "apartment" "tenant" "cost" "apartment-cost"
                     "rent-payment" "garage" "garage-payment" "expense-type" "property-tax-config"]]
        (println etype "->" (count (storage/find-by-type conn etype))))))
  (System/exit 0))
