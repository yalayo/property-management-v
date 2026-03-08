(ns app.auth-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.auth-ui.subs :as subs]
            [app.auth-ui.events :as events]
            ["/pages/login$default" :as login-js]))

(def login (r/adapt-react-class login-js))

(defn component [id]
  [login
   {:id id
    :user @(re-frame/subscribe [::subs/sign-in-form :user])
    :onChangeUser #(re-frame/dispatch [::events/update-sign-in :user (-> % .-target .-value)])
    :password @(re-frame/subscribe [::subs/sign-in-form :password])
    :onChangePassword #(re-frame/dispatch [::events/update-sign-in :password (-> % .-target .-value)])
    :submitLogin #(re-frame/dispatch [::events/sign-in])
    :showSignUp #(re-frame/dispatch [::events/show-sign-up])}])