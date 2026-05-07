(ns app.worker.routes
  (:require
   [app.worker.handler :as handler]))

(defn create-routes [command-handlers query-handlers]
  [["/command" {:post {:handler (handler/command command-handlers)}}]
   ["/query" {:get {:handler (handler/command query-handlers)}}]])