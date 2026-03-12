(ns app.main-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.main-ui.subs   :as subs]
            [app.main-ui.events :as events]
            [app.main-ui.analytics :as analytics]
            [app.auth-ui.views      :as auth]
            [app.register-ui.interface :as register]
            [app.plans-ui.interface :as plans-ui]
            [app.property-ui.interface :as property-ui]
            [app.property-ui.subs :as property-subs]
            [app.survey-ui.views :as survey]
            ;; React page imports (thin wrappers — no separate Polylith component needed)
            ["/pages/main$default"                :as main-js]
            ["/pages/home$default"                :as home-js]
            ["/pages/dashboard$default"           :as dashboard-js]
            ["/pages/onboarding$default"          :as onboarding-js]
            ["/pages/bank-accounts$default"       :as bank-accounts-js]
            ["/pages/change-password$default"     :as change-password-js]
            ["/pages/subscription-tiers$default"  :as subscription-tiers-js]
            ["/pages/waiting-list$default"        :as waiting-list-js]
            ["/pages/features-pricing$default"    :as features-pricing-js]
            ["/pages/not-found$default"           :as not-found-js]))

(def main              (r/adapt-react-class main-js))
(def home              (r/adapt-react-class home-js))
(def dashboard         (r/adapt-react-class dashboard-js))
(def onboarding        (r/adapt-react-class onboarding-js))
(def bank-accounts     (r/adapt-react-class bank-accounts-js))
(def change-password   (r/adapt-react-class change-password-js))
(def subscription-tiers (r/adapt-react-class subscription-tiers-js))
(def waiting-list      (r/adapt-react-class waiting-list-js))
(def features-pricing  (r/adapt-react-class features-pricing-js))
(def not-found         (r/adapt-react-class not-found-js))

(defn component []
  (let [active       @(re-frame/subscribe [::subs/active-section])
        current-user @(re-frame/subscribe [::subs/current-user])
        survey-email @(re-frame/subscribe [::subs/survey-email])
        properties   @(re-frame/subscribe [::property-subs/properties])]
    [main
     {:activeComponent
      (r/as-element
       (case active
         "home"               [home {:tracker analytics/event}
                               (r/as-element [survey/component "survey"])]
         "auth"               [auth/component {:id "auth"}]
         "register"           [register/component {:id "register"}]
         "dashboard"          [dashboard {:onLogout              #(re-frame/dispatch [::events/sign-out])
                                         :onNavigateToProperties #(re-frame/dispatch [::events/change-active-section "properties"])
                                         :onLoadData            #(property-ui/load-properties)
                                         :properties            (clj->js properties)}]
         "onboarding"         [onboarding {}]
         "bank-accounts"      [bank-accounts {:user current-user}]
         "change-password"    [change-password {:user current-user}]
         "subscription-tiers" [subscription-tiers {}]
         "waiting-list"       [waiting-list {:email        survey-email
                                             :onViewPricing #(re-frame/dispatch [::events/change-active-section "features-pricing"])
                                             :onGoHome      #(re-frame/dispatch [::events/change-active-section "home"])}]
         "features-pricing"   [features-pricing {:email    survey-email
                                              :onSignIn #(re-frame/dispatch [::events/change-active-section "auth"])
                                              :onSignUp #(re-frame/dispatch [::events/change-active-section "register"])
                                              :onGoHome #(re-frame/dispatch [::events/change-active-section "home"])}]
         "plans"              [plans-ui/component {:id "plans"}]
         "properties"         [property-ui/component {:id "properties"}]
         [not-found {}]))}]))
