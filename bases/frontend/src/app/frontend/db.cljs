(ns app.frontend.db)

(def default-db {:user-loged-in? false :initialised? false})

;; To be used to persist the state in the browser's local storage
(def ls-key "ams-state")                         ;; localstore key

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))