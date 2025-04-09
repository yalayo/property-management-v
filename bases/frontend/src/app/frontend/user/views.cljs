(ns app.frontend.user.views
  (:require [reagent.core  :as r]
            [re-frame.core :as re-frame]
            ["/pages/login$default" :as login]))

(def login-component (r/adapt-react-class login))