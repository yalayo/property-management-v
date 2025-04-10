(ns app.frontend.survey.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::questions
 (fn [db]
   (get-in db [:survey :questions])))

(re-frame/reg-sub
 ::current-question-index
 (fn [db]
   (get-in db [:survey :current-question-index])))

(re-frame/reg-sub
 ::current-question-response
 (fn [db]
   (let [index (get-in db [:survey :current-question-index])
         id (keyword (str index))]
     (get-in db [:survey :responses id]))))

(re-frame/reg-sub
 ::show-email-form
 (fn [db]
   (get-in db [:survey :show-email-form])))

(re-frame/reg-sub
 ::email-form-pending
 (fn [db]
   (let [pending? (get-in db [:survey :email-form-pending])]
     (if (some? pending?) pending? false))))

(re-frame/reg-sub
 ::form
 (fn [db [_ id]]
   (get-in db [:survey :form id] "")))