(ns app.survey.persistance
  (:require [app.worker.db :as db]
            [app.worker.async :refer [js-await]]))

(defn get-questions []
  (let [query {:select   [:id :text :order]
               :from     [:questions]
               :where    [:= :active 1]
               :order-by [[:order :asc]]}]
    (js-await [{:keys [success results]} (db/query+ query)]
              (if success
                results
                (throw (ex-info "DB error: get-questions failed" {}))))))

(defn save-survey-response [env email responses]
  (let [response-id    (js/crypto.randomUUID)
        responses-json (js/JSON.stringify (clj->js responses))
        query          {:insert-into [:survey_responses]
                        :columns     [:id :email :responses]
                        :values      [[response-id email responses-json]]}]
    (js-await [{:keys [success]} (db/run+ env query)]
              (if success
                {:created true :id response-id}
                (throw (js/Error. "Insert failed"))))))
