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
       (assoc-in db [:survey :show-email-form] true)
       (assoc-in db [:survey :current-question-index] (inc index))))))

(re-frame/reg-event-db
 ::previous-question
 (fn [db]
   (let [index (get-in db [:survey :current-question-index])]
     (when (pos? index)
       (assoc-in db [:survey :current-question-index] (dec index))))))