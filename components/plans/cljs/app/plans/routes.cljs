(ns app.plans.routes
  (:require [app.plans.handler :as handler]))

(defn make-routes [storage]
  [["/plans" {:get {:handler (partial handler/get-plans storage)}}]])
