(ns app.survey-ui.db)

(def ls-key "props-state")

(defn db->local-store [db]
  (.setItem js/localStorage ls-key (str db)))

(def default-db
  {:survey {:questions             nil
            :loading?              true
            :error                 nil
            :current-question-index 0
            :answers               {}
            :show-email-form?      false
            :email                 ""
            :email-pending?        false}})
