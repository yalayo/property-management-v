(ns app.apartment.routes
  (:require [app.apartment.handler :as handler]))

(defn make-routes [storage]
  [["/apartments"
    {:get  {:handler (partial handler/get-apartments storage)}
     :post {:handler (partial handler/create-apartment storage)}}]
   ["/apartments/:id"
    {:put    {:handler (partial handler/update-apartment storage)}
     :delete {:handler (partial handler/delete-apartment storage)}}]
   ["/apartments/onboarding"
    {:get {:handler (partial handler/get-all-onboardings storage)}}]
   ["/apartments/onboard/:id"
    {:get  {:handler (partial handler/get-onboarding storage)}
     :post {:handler (partial handler/start-onboarding storage)}}]
   ["/apartments/by-property/:property-id"
    {:get {:handler (partial handler/get-apartments-by-property storage)}}]])
