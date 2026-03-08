(ns app.web.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::logged-in
 (fn [db [_ _]]
   (get-in db [:user :user-loged-in?] false)))