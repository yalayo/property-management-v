(ns app.plans-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.plans-ui.subs :as subs]
            [app.plans-ui.events :as events]
            ["/pages/plans$default" :as plans-js]))

(def plans-page (r/adapt-react-class plans-js))

(defn component [_]
  [plans-page
   {:user       @(re-frame/subscribe [::subs/current-user])
    :onSelectPlan (fn [plan-id]
                    (re-frame/dispatch [::events/select-plan plan-id]))
    :onSkip     #(re-frame/dispatch [::events/go-to-dashboard])}])
