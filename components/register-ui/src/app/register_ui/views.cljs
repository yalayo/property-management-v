(ns app.register-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.register-ui.subs :as subs]
            ["/pages/register$default" :as register-js]))

(def register (r/adapt-react-class register-js))

(defn component [{:keys [on-login-click on-go-home on-submit]}]
  [register
   {:user      @(re-frame/subscribe [::subs/current-user])
    :isPending @(re-frame/subscribe [::subs/sign-up-loading])
    :onSubmit  on-submit
    :showSignIn on-login-click
    :onGoHome   on-go-home}])
