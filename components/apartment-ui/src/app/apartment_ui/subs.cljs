(ns app.apartment-ui.subs
  (:require [re-frame.core :as re-frame]))

(re-frame/reg-sub
 ::apartments
 (fn [db _]
   (get-in db [:apartments :list] [])))

(re-frame/reg-sub
 ::loading?
 (fn [db _]
   (get-in db [:apartments :loading?] false)))

(re-frame/reg-sub
 ::saving?
 (fn [db _]
   (get-in db [:apartments :saving?] false)))

(re-frame/reg-sub
 ::add-dialog-open?
 (fn [db _]
   (get-in db [:apartments :add-dialog-open?] false)))

(re-frame/reg-sub
 ::selected-apartment-id
 (fn [db _]
   (get-in db [:apartments :selected-id])))

(re-frame/reg-sub
 ::new-apartment-code
 (fn [db _]
   (get-in db [:apartments :new-code] "")))

(re-frame/reg-sub
 ::new-apartment-property-id
 (fn [db _]
   (get-in db [:apartments :new-property-id])))

(re-frame/reg-sub
 ::property-filter
 (fn [db _]
   (get-in db [:apartments :property-filter])))

(re-frame/reg-sub
 ::assign-apt-id
 (fn [db _]
   (get-in db [:apartments :assign-apt-id])))

(re-frame/reg-sub
 ::onboarding?
 (fn [db _]
   (get-in db [:apartments :onboarding?] false)))

(re-frame/reg-sub
 ::onboarding-status
 (fn [db _]
   (get-in db [:apartments :onboarding-status])))

(re-frame/reg-sub
 ::onboardings-by-apartment
 (fn [db _]
   (->> (get-in db [:apartments :onboardings] [])
        (group-by :apartment_id)
        (reduce (fn [acc [apt-id records]]
                  (assoc acc apt-id (first records)))
                {}))))

