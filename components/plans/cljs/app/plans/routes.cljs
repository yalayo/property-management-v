(ns app.plans.routes
  (:require [app.plans.handler :as handler]))

(def routes
  [["/plans"     {:get  {:handler handler/get-plans}
                  :post {:handler handler/create-plan}}]
   ["/plans/:id" {:get    {:handler handler/get-plan}
                  :put    {:handler handler/update-plan}
                  :delete {:handler handler/delete-plan}}]])
