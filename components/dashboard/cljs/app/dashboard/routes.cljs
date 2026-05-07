(ns app.dashboard.routes
  (:require [app.dashboard.handler :as handler]))

(def routes
  [["/dashboard/occupancy"
    {:get {:handler handler/get-occupancy}}]
   ["/stats"
    {:get {:handler handler/get-public-stats}}]
   ["/stats/satisfaction"
    {:post {:handler handler/post-satisfaction}}]])
