(ns app.apartment.routes
  (:require [app.apartment.handler :as handler]))

(defn create-routes [controller]
  [["/apartments"
    {:get  {:handler (handler/get-apartments controller)}
     :post {:handler (handler/create-apartment controller)}}]
   ["/apartments/:id"
    {:put    {:handler (handler/update-apartment controller)}
     :delete {:handler (handler/delete-apartment controller)}}]
   ["/apartments/onboarding"
    {:get {:handler (handler/get-all-onboardings controller)}}]
   ["/apartments/onboard/:id"
    {:get  {:handler (handler/get-onboarding controller)}
     :post {:handler (handler/start-onboarding controller)}}]
   ["/apartments/by-property/:property-id"
    {:get {:handler (handler/get-apartments-by-property controller)}}]])
