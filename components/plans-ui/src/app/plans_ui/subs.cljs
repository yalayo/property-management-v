(ns app.plans-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::current-user
 (fn [db _]
   (get-in db [:user :info])))
