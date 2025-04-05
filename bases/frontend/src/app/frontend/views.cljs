(ns app.frontend.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.frontend.events :as events]
            [app.frontend.subs :as subs]
            ["/SignIn" :as signin]))

(def signin-component (r/adapt-react-class (.-SignIn signin)))

(defn app []
  [:<>
   [signin-component]])