(ns app.plans.routes
  (:require [app.plans.handler :as handler]))

(def routes
  [["/plans" {:get {:handler handler/get-plans}}]])
