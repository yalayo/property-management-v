(ns app.dashboard-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::occupancy
 (fn [db _]
   (get-in db [:dashboard :occupancy])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:dashboard :loading?] false)))
