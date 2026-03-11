(ns app.auth-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.auth-ui.subs :as subs]
            [app.auth-ui.events :as events]
            ["/pages/login$default" :as login-js]))

(def login (r/adapt-react-class login-js))

(defn component [id]
  [login
   {:id        id
    :user      @(re-frame/subscribe [::subs/current-user])
    :isLoading @(re-frame/subscribe [::subs/sign-in-loading])
    :onSubmit  (fn [data] (re-frame/dispatch [::events/sign-in (js->clj data :keywordize-keys true)]))
    :showSignUp #(re-frame/dispatch [::events/show-sign-up])}])
