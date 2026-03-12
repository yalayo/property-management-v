(ns app.dashboard.routes
  (:require [app.dashboard.handler :as handler]))

(def routes
  [["/dashboard/occupancy"
    {:get {:handler handler/get-occupancy}}]])
