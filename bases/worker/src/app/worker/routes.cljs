(ns app.worker.routes
  (:require
   [app.worker.handler :as handler]))

(defn create-routes [core storage]
  [["/command" {:post {:handler (handler/command core storage)}}]
   ["/query" {:get  {:handler (handler/command core storage)}}]])
