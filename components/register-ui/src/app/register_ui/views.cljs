(ns app.register-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.register-ui.subs :as subs]
            [app.register-ui.events :as events]
            ["/pages/register$default" :as register-js]))

(def register (r/adapt-react-class register-js))

(defn component [id]
  [register
   {:id        id
    :user      @(re-frame/subscribe [::subs/current-user])
    :isPending @(re-frame/subscribe [::subs/sign-up-loading])
    :onSubmit  (fn [data] (re-frame/dispatch [::events/sign-up (js->clj data :keywordize-keys true)]))
    :showSignIn #(re-frame/dispatch [::events/show-sign-in])
    :onGoHome   #(re-frame/dispatch [::events/go-home])}])
