(ns app.survey-ui.events
  (:require [re-frame.core :as re-frame]
            [app.auth-ui.config :as config]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]))

(re-frame/reg-event-fx
 ::load-questions
 (fn [{:keys [db]} _]
   {:db         (assoc-in db [:survey :loading?] true)
    :http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/questions")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::questions-loaded]
                 :on-failure      [::questions-error]}}))

(re-frame/reg-event-db
 ::questions-loaded
 (fn [db [_ questions]]
   (-> db
       (assoc-in [:survey :questions] (js->clj questions :keywordize-keys true))
       (assoc-in [:survey :loading?] false)
       (assoc-in [:survey :error] nil))))

(re-frame/reg-event-db
 ::questions-error
 (fn [db [_ error]]
   (js/console.error "Survey questions failed:" error)
   (-> db
       (assoc-in [:survey :loading?] false)
       (assoc-in [:survey :error] error))))

(re-frame/reg-event-db
 ::answer-question
 (fn [db [_ answer]]
   (let [idx      (get-in db [:survey :current-question-index] 0)
         questions (get-in db [:survey :questions] [])
         q-id     (:id (nth questions idx nil))]
     (assoc-in db [:survey :answers q-id] answer))))

(re-frame/reg-event-db
 ::next-question
 (fn [db _]
   (let [idx      (get-in db [:survey :current-question-index] 0)
         questions (get-in db [:survey :questions] [])
         last-idx (dec (count questions))]
     (if (< idx last-idx)
       (update-in db [:survey :current-question-index] inc)
       (assoc-in db [:survey :show-email-form?] true)))))

(re-frame/reg-event-db
 ::prev-question
 (fn [db _]
   (if (get-in db [:survey :show-email-form?])
     (assoc-in db [:survey :show-email-form?] false)
     (update-in db [:survey :current-question-index]
                (fn [i] (max 0 (dec i)))))))

(re-frame/reg-event-db
 ::update-email
 (fn [db [_ email]]
   (assoc-in db [:survey :email] email)))

(re-frame/reg-event-fx
 ::submit-survey
 (fn [{:keys [db]} _]
   (let [questions (get-in db [:survey :questions] [])
         answers   (get-in db [:survey :answers] {})
         email     (get-in db [:survey :email] "")
         responses (mapv (fn [q]
                           {:questionId (:id q)
                            :answer     (get answers (:id q) false)})
                         questions)]
     {:db         (assoc-in db [:survey :email-pending?] true)
      :http-xhrio {:method          :post
                   :uri             (str (config/get-api-url) "/api/survey/submit")
                   :params          {:responses responses :email email}
                   :format          (ajax-edn/edn-request-format)
                   :response-format (ajax-edn/edn-response-format)
                   :timeout         8000
                   :on-success      [::survey-submitted]
                   :on-failure      [::survey-submit-error]}})))

(re-frame/reg-event-db
 ::survey-submitted
 (fn [db _]
   (-> db
       (assoc-in [:survey :email-pending?] false)
       (assoc-in [:ui :active-section] "waiting-list"))))

(re-frame/reg-event-db
 ::survey-submit-error
 (fn [db [_ error]]
   (js/console.error "Survey submit failed:" error)
   (assoc-in db [:survey :email-pending?] false)))
