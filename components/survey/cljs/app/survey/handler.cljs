(ns app.survey.handler
  (:require [app.survey.persistance :as persistance]
            [app.survey.analytics :as analytics]
            [app.worker.async :refer [js-await]]
            [app.worker.cf :as cf]))

(defn get-questions [_]
  (js-await [questions (persistance/get-questions)]
            (cf/response-edn questions {:status 200})))

(defn post-submit [{:keys [request env]}]
  (js-await [data (cf/request->edn request)]
            (let [{:keys [email responses]} data]
              (js-await [result (persistance/save-survey-response env email responses)]
                        (analytics/send-event! email "survey_submitted" {:email email} (aget env "GA_SECRET"))
                        (cf/response-edn result {:status 201})))))
