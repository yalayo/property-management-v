(ns app.worker.routes
  (:require
   [app.worker.handler :as handler]))

(defn create-routes [core storage controller]
  [["/command" {:post {:handler (handler/command core storage controller)}}]
   ["/query" {:get  {:handler (handler/command core storage controller)}}]])
