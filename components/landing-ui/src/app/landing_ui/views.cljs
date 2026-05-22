(ns app.landing-ui.views
  (:require [reagent.core :as r]
            ["/pages/home$default" :as landing-js]))

(def landing-page (r/adapt-react-class landing-js))

;; on-submit is called with the raw camelCase JS form object; conversion to
;; kebab-case ClojureScript keys happens in web/views.cljs before dispatch.
(defn component [{:keys [on-login-click on-create-account-click on-submit]}]
  [landing-page 
   {:onSignIn           on-login-click 
    :onSignUp  (or on-create-account-click on-login-click) 
    :on-submit                on-submit}])
