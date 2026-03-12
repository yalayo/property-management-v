(ns app.web.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            [app.web.subs :as subs]
            [app.main-ui.views :as main]))

#_(def home (r/adapt-react-class home-js))

(defn home-component []
  [:<>
   (main/component)])

#_(defn platform-component []
  (let [user-loged-in? @(re-frame/subscribe [::subs/logged-in])]
    [:<>
     (if user-loged-in?
       (auth/component)
       (auth/component))]))