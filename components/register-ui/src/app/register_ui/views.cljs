(ns app.register-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.register-ui.subs :as subs]
            [app.register-ui.events :as events]
            ["/pages/register$default" :as register-js]))

(def register (r/adapt-react-class register-js))

(defn component [id]
  [register
   {:id id
    :name @(re-frame/subscribe [::subs/sign-up-form :name])
    :onChangeName #(re-frame/dispatch [::events/update-sign-up :name (-> % .-target .-value)])
    :user @(re-frame/subscribe [::subs/sign-up-form :email])
    :onChangeUser #(re-frame/dispatch [::events/update-sign-up :email (-> % .-target .-value)])
    :password @(re-frame/subscribe [::subs/sign-up-form :password])
    :onChangePassword #(re-frame/dispatch [::events/update-sign-up :password (-> % .-target .-value)])
    :submitRegister #(re-frame/dispatch [::events/sign-up])
    :showSignIn #(re-frame/dispatch [::events/show-sign-in])}])