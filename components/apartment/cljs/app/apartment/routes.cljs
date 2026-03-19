(ns app.apartment.routes
  (:require [app.apartment.handler :as handler]))

(def routes
  [["/apartments"
    {:get  {:handler handler/get-apartments}
     :post {:handler handler/create-apartment}}]
   ["/apartments/:id"
    {:put    {:handler handler/update-apartment}
     :delete {:handler handler/delete-apartment}}]
   ["/apartments/onboarding"
    {:get {:handler handler/get-all-onboardings}}]
   ["/apartments/onboard/:id"
    {:get  {:handler handler/get-onboarding}
     :post {:handler handler/start-onboarding}}]
   ["/apartments/by-property/:property-id"
    {:get {:handler handler/get-apartments-by-property}}]])
