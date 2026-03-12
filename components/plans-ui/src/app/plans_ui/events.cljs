(ns app.plans-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.plans-ui.db :as db]
            [app.plans-ui.analytics :as analytics]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-db
 ::go-to-dashboard
 [local-storage-interceptor]
 (fn [db _]
   (assoc-in db [:ui :active-section] "dashboard")))

(re-frame/reg-event-db
 ::select-plan
 [local-storage-interceptor]
 (fn [db [_ plan-id]]
   (analytics/event "plan_selected" {:plan plan-id})
   ;; Store chosen plan and navigate to dashboard for now
   ;; (payment flow can be wired here later)
   (-> db
       (assoc-in [:user :selected-plan] plan-id)
       (assoc-in [:ui :active-section] "dashboard"))))
