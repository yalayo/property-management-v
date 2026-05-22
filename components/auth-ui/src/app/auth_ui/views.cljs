(ns app.auth-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.auth-ui.subs :as subs]
            ["/pages/login$default" :as login-js]))

(def login (r/adapt-react-class login-js))

(defn component [{:keys [on-create-account-click on-go-home on-submit]}]
  [login
   {:user       @(re-frame/subscribe [::subs/current-user])
    :isLoading  @(re-frame/subscribe [::subs/sign-in-loading])
    :onSubmit   on-submit
    :showSignUp on-create-account-click
    :onGoHome   on-go-home}])
