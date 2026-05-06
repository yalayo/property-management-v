(ns app.survey.persistance
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]))

(defn get-questions [storage]
  ;; "order" is a reserved SQL keyword — order by :id instead (seeded data has id = order).
  (let [query {:select   [:id :text]
               :from     [:props_questions]
               :where    [:= :active 1]
               :order-by [[:id :asc]]}]
    (js-await [{:keys [success results]} (storage/query+ storage query)]
              (if success
                results
                (throw (ex-info "DB error: get-questions failed" {}))))))

(defn save-survey-response [storage email responses]
  (let [responses-json (js/JSON.stringify (clj->js responses))
        query          {:insert-into [:props_survey_responses]
                        :columns     [:email :responses]
                        :values      [[email responses-json]]}]
    (js-await [{:keys [success]} (storage/run+ storage query)]
              (if success
                {:created true}
                (throw (js/Error. "Insert failed"))))))
