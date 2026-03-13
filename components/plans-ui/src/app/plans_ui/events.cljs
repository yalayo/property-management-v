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

(re-frame/reg-event-fx
 ::select-plan
 [local-storage-interceptor]
 (fn [{:keys [db]} [_ plan-id]]
   (analytics/event "plan_selected" {:plan plan-id})
   {:db       (assoc-in db [:ui :active-section] "payment")
    :dispatch [:app.payment-ui.events/select-tier plan-id]}))
