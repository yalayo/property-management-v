(ns app.cost-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::costs
 (fn [db _]
   (get-in db [:costs :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:costs :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:costs :saving?] false)))
