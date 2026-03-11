(ns app.survey-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::questions
 (fn [db _]
   (get-in db [:survey :questions])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:survey :loading?] true)))

(re-frame/reg-sub
 ::error
 (fn [db _]
   (get-in db [:survey :error])))

(re-frame/reg-sub
 ::current-question-index
 (fn [db _]
   (get-in db [:survey :current-question-index] 0)))

(re-frame/reg-sub
 ::current-question-response
 (fn [db _]
   (let [idx       (get-in db [:survey :current-question-index] 0)
         questions (get-in db [:survey :questions] [])
         q-id      (:id (nth questions idx nil))]
     (get-in db [:survey :answers q-id] false))))

(re-frame/reg-sub
 ::show-email-form?
 (fn [db _]
   (get-in db [:survey :show-email-form?] false)))

(re-frame/reg-sub
 ::email
 (fn [db _]
   (get-in db [:survey :email] "")))

(re-frame/reg-sub
 ::email-pending?
 (fn [db _]
   (get-in db [:survey :email-pending?] false)))
