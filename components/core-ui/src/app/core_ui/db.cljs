(ns app.core-ui.db)

(def default-db {})

;; To be used to persist the state in the browser's local storage
(def ls-key "van-state")                         ;; localstore key

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))