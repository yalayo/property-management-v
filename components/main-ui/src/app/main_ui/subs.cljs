(ns app.main-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::active-section
 (fn [db]
   (get-in db [:ui :active-section] "home")))