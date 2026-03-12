(ns app.dashboard-ui.views
  (:require [reagent.core :as r]
            [re-frame.core :as re-frame]
            [app.dashboard-ui.subs :as subs]
            [app.dashboard-ui.events :as events]
            ["/components/dashboard/OccupancyWidget$default" :as occupancy-widget-js]))

(def occupancy-widget (r/adapt-react-class occupancy-widget-js))

(defn component [{:keys [on-navigate-to-apartments]}]
  (re-frame/dispatch [::events/load-occupancy])
  (fn [{:keys [on-navigate-to-apartments]}]
    (let [occupancy @(re-frame/subscribe [::subs/occupancy])
          loading?  @(re-frame/subscribe [::subs/loading?])]
      [occupancy-widget
       {:occupancy              (when occupancy
                                  (clj->js {:totalApartments (:total_apartments occupancy)
                                            :occupied        (:occupied occupancy)
                                            :empty           (:empty occupancy)}))
        :isLoading              loading?
        :onNavigateToApartments on-navigate-to-apartments}])))
