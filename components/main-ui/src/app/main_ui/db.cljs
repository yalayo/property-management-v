(ns app.main-ui.db)

(def ls-key "alm-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))