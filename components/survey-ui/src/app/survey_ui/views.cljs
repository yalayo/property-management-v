(ns app.survey-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.survey-ui.subs :as subs]
            [app.survey-ui.events :as events]
            ["/components/landing/Survey$default" :as survey-js]))

(def survey (r/adapt-react-class survey-js))

(defn component [id]
  (r/create-class
   {:component-did-mount
    (fn [_] (re-frame/dispatch [::events/load-questions]))
    :reagent-render
    (fn [_id]
      [survey
       {:questions               (clj->js @(re-frame/subscribe [::subs/questions]))
        :isLoading               @(re-frame/subscribe [::subs/loading?])
        :error                   @(re-frame/subscribe [::subs/error])
        :currentQuestionIndex    @(re-frame/subscribe [::subs/current-question-index])
        :currentQuestionResponse @(re-frame/subscribe [::subs/current-question-response])
        :showEmailForm           @(re-frame/subscribe [::subs/show-email-form?])
        :isEmailFormPending      @(re-frame/subscribe [::subs/email-pending?])
        :email                   @(re-frame/subscribe [::subs/email])
        :onChangeEmail           (fn [e] (re-frame/dispatch [::events/update-email (-> e .-target .-value)]))
        :handleAnswerSelection   (fn [answer] (re-frame/dispatch [::events/answer-question answer]))
        :handleNext              #(re-frame/dispatch [::events/next-question])
        :handlePrevious          #(re-frame/dispatch [::events/prev-question])
        :handleSubmit            #(re-frame/dispatch [::events/submit-survey])}])}))
