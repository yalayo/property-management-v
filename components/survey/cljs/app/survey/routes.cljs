(ns app.survey.routes
  (:require [app.survey.handler :as handler]))

(defn make-routes [storage]
  [["/questions"     {:get  {:handler (partial handler/get-questions storage)}}]
   ["/survey/submit" {:post {:handler (partial handler/post-submit storage)}}]])
