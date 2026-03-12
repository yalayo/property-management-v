(ns app.dashboard-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.dashboard-ui.db :as db]
            [app.dashboard-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))

(re-frame/reg-event-fx
 ::load-occupancy
 (fn [{:keys [_db]} _]
   {:http-xhrio {:method          :get
                 :uri             (str (config/get-api-url) "/api/dashboard/occupancy")
                 :response-format (ajax-edn/edn-response-format)
                 :timeout         8000
                 :on-success      [::occupancy-loaded]
                 :on-failure      [::occupancy-error]}}))

(re-frame/reg-event-db
 ::occupancy-loaded
 [local-storage-interceptor]
 (fn [db [_ data]]
   (-> db
       (assoc-in [:dashboard :occupancy] data)
       (assoc-in [:dashboard :loading?] false))))

(re-frame/reg-event-fx
 ::occupancy-error
 (fn [_ [_ error]]
   (js/console.error "Failed to load occupancy:" error)
   {}))
