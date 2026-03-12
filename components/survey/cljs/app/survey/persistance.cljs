(ns app.survey.persistance
  (:require [app.worker.db :as db]
            [app.worker.async :refer [js-await]]))

(defn get-questions []
  ;; "order" is a reserved SQL keyword — order by :id instead (seeded data has id = order).
  ;; honey.sql/raw in ClojureScript causes an IFn runtime error, so we avoid it here.
  (let [query {:select   [:id :text]
               :from     [:questions]
               :where    [:= :active 1]
               :order-by [[:id :asc]]}]
    (js-await [{:keys [success results]} (db/query+ query)]
              (if success
                results
                (throw (ex-info "DB error: get-questions failed" {}))))))

(defn save-survey-response [env email responses]
  (let [responses-json (js/JSON.stringify (clj->js responses))
        query          {:insert-into [:survey_responses]
                        :columns     [:email :responses]
                        :values      [[email responses-json]]}]
    (js-await [{:keys [success]} (db/run+ env query)]
              (if success
                {:created true}
                (throw (js/Error. "Insert failed"))))))
