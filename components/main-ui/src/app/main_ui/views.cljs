(ns app.main-ui.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.main-ui.subs :as subs]
            [app.main-ui.events :as events]
            [app.main-ui.analytics :as analytics]
            [app.home-ui.views :as home]
            [app.auth-ui.views :as auth]
            [app.register-ui.interface :as register]
            [app.plans-ui.interface :as plans]
            [app.dashboard-ui.interface :as dashboard]
            ["/pages/main$default" :as main-js]))

(def main (r/adapt-react-class main-js))

(defn component []
  (let [active @(re-frame/subscribe [::subs/active-section])]
    [main
     {:activeComponent
      (r/as-element
       (case active
         "home" [home/component {:id "home" :tracker analytics/event}]
         "auth" [auth/component {:id "auth"}]
         "register" [register/component {:id "register"}]
         "plans" [plans/component {:id "plans"}]
         "dashboard" [dashboard/component {:id "dashboard"}]
         nil))}]))