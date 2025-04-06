(ns app.frontend.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.frontend.events :as events]
            [app.frontend.subs :as subs]
            ["/components/landing/Survey" :as survey]))

(def survey-component (r/adapt-react-class (.-Survey survey)))

(defn app []
  [:<>
   [survey-component]])