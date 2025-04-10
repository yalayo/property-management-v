(ns app.frontend.survey.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [cljs.reader]
            [app.frontend.db :as db]
            [day8.re-frame.tracing :refer-macros [fn-traced]]
            [day8.re-frame.http-fx]))

(re-frame/reg-event-db
 ::answer-question
 (fn [db [_ val]]
   (let [index (get-in db [:survey :current-question-index])
         id (keyword (str index))]
     (assoc-in db [:survey :responses id] val))))

(re-frame/reg-event-db
 ::next-question
 (fn [db]
   (let [index (get-in db [:survey :current-question-index])]
     (if (>= index 19)
       (-> db
           (assoc-in [:survey :show-email-form] true)
           (assoc-in [:survey :current-question-index] (inc index)))
       (assoc-in db [:survey :current-question-index] (inc index))))))

(re-frame/reg-event-db
 ::previous-question
 (fn [db]
   (let [index (get-in db [:survey :current-question-index])
         show-email-form? (get-in db [:survey :show-email-form])]
     (when (pos? index)
       (if (and (<= index 20) show-email-form?)
         (-> db
             (assoc-in [:survey :show-email-form] false)
             (assoc-in [:survey :current-question-index] (dec index)))
         (assoc-in db [:survey :current-question-index] (dec index)))))))

(re-frame/reg-event-db
 ::update-email-form
 (fn [db [_ id val]]
   (assoc-in db [:survey :form id] val)))

(re-frame/reg-event-db
 ::save-survey
 (fn [db]
   (let [survey-data {:responses (get-in db [:survey :responses])
                      :email (get-in db [:survey :form :email])}]
     (js/console.log "Send to backend:" survey-data))))