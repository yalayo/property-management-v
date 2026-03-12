(ns app.survey.routes
  (:require [app.survey.handler :as handler]))

(def routes
  [["/questions"     {:get  {:handler handler/get-questions}}]
   ["/survey/submit" {:post {:handler handler/post-submit}}]])
