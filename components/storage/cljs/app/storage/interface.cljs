(ns app.storage.interface
  (:require [integrant.core :as ig]
            [app.storage.core :as core]))

;; Called by the worker once per request to bind the live D1 database handle.
(defn set-db! [db]
  (core/set-db! db))

(defn query+ [storage query-map]
  ((:query+ storage) query-map))

(defn run+ [storage query-map]
  ((:run+ storage) query-map))

;; ---------------------------------------------------------------------------
;; Integrant keys
;; ---------------------------------------------------------------------------

(defmethod ig/init-key ::d1 [_ _]
  {:query+ core/d1-query+
   :run+   core/d1-run+})

(defmethod ig/init-key ::memory [_ {:keys [tables]}]
  (let [state (atom (or tables {}))]
    {:query+ (partial core/mem-query+ state)
     :run+   (partial core/mem-run+ state)}))
