(ns app.web.db)

(def default-db {})

;; To be used to persist the state in the browser's local storage
(def ls-key "props-state")                         ;; localstore key

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))