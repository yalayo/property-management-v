(ns app.main-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::active-section
 (fn [db]
   (get-in db [:ui :active-section] "home")))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))