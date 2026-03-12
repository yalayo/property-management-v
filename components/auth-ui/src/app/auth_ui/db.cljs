(ns app.auth-ui.db)

(def default-db {:user-loged-in? false :initialised? false})

(def ls-key "props-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))