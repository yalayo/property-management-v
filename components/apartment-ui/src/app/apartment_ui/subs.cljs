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
 ::new-apartment-wohnflaeche
 (fn [db _]
   (get-in db [:apartments :new-wohnflaeche] "")))

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
 ::detail-apartment-id
 (fn [db _]
   (get-in db [:apartments :detail-id])))

(re-frame/reg-sub
 ::assign-error
 (fn [db _]
   (get-in db [:apartments :assign-error])))

(re-frame/reg-sub
 ::initial-tab
 (fn [db _]
   (get-in db [:apartments :initial-tab])))

(re-frame/reg-sub
 ::current-year
 (fn [db _]
   (get-in db [:apartments :current-year])))

(re-frame/reg-sub
 ::garages
 (fn [db _]
   (get-in db [:garages :list] [])))

(re-frame/reg-sub
 ::garages-loading?
 (fn [db _]
   (get-in db [:garages :loading?] false)))

(re-frame/reg-sub
 ::garages-saving?
 (fn [db _]
   (get-in db [:garages :saving?] false)))

(re-frame/reg-sub
 ::selected-garage-id
 (fn [db _]
   (get-in db [:garages :selected-id])))

(re-frame/reg-sub
 ::garage-add-dialog-open?
 (fn [db _]
   (get-in db [:garages :add-dialog-open?] false)))

(re-frame/reg-sub
 ::new-garage-code
 (fn [db _]
   (get-in db [:garages :new-code] "")))

(re-frame/reg-sub
 ::new-garage-property-id
 (fn [db _]
   (get-in db [:garages :new-property-id])))

(re-frame/reg-sub
 ::new-garage-flaeche
 (fn [db _]
   (get-in db [:garages :new-flaeche] "")))

(re-frame/reg-sub
 ::onboardings-by-apartment
 (fn [db _]
   (->> (get-in db [:apartments :onboardings] [])
        (group-by :onboarding/apartment-id)
        (reduce (fn [acc [apt-id records]]
                  (assoc acc apt-id (first records)))
                {}))))

