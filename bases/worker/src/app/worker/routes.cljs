(ns app.worker.routes
  (:require
   [app.worker.handler :as handler]))

(defn create-routes [core storage controller]
  [["/command"        {:post {:handler (handler/command         core storage controller)}}]
   ["/query"          {:post {:handler (handler/query           core storage controller) :auth-required? true}}]
   ["/questions"      {:get  {:handler (handler/survey-questions core storage controller)}}]
   ["/survey/submit"  {:post {:handler (handler/survey-submit    core storage controller)}}]])
