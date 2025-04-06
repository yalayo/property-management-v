(ns app.frontend.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.frontend.events :as events]
            [app.frontend.subs :as subs]
            ["/pages/home$default" :as home]
            ["/components/landing/Survey$default" :as survey]))

(js/console.log survey)

(def home-component (r/adapt-react-class home))
(def survey-component (r/adapt-react-class survey))

(defn app []
  [:<>
   [home-component {:isLoggedIn false :user {}}
    [survey-component {:isLoading false}]]])