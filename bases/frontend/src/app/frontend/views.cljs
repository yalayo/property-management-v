(ns app.frontend.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.frontend.events :as events]
            [app.frontend.subs :as subs]
            [app.frontend.survey.subs :as survey-subs]
            [app.frontend.survey.events :as survey-events]
            ["/pages/home$default" :as home]
            ["/components/landing/Survey$default" :as survey]))

(def home-component (r/adapt-react-class home))
(def survey-component (r/adapt-react-class survey))

(defn app []
  [:<>
   [home-component {:isLoggedIn false :user {}}
    [survey-component {:isLoading false 
                       :questions @(re-frame/subscribe [::survey-subs/questions])
                       :currentQuestionIndex @(re-frame/subscribe [::survey-subs/current-question-index])
                       :showEmailForm @(re-frame/subscribe [::survey-subs/show-email-form])
                       :handleAnswerSelection #(re-frame/dispatch [::survey-events/answer-question %])
                       :handleNext #(re-frame/dispatch [::survey-events/next-question])
                       :handlePrevious #(re-frame/dispatch [::survey-events/previous-question])}]]])