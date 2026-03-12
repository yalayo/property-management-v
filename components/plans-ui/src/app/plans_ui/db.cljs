(ns app.plans-ui.db)

(def ls-key "props-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))
