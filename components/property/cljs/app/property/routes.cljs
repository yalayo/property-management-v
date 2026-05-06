(ns app.property.routes
  (:require [app.property.handler :as handler]))

(defn make-routes [storage]
  [["/properties"
    {:get  {:handler (partial handler/get-properties storage)}
     :post {:handler (partial handler/create-property storage)}}]
   ["/properties/:id"
    {:put    {:handler (partial handler/update-property storage)}
     :delete {:handler (partial handler/delete-property storage)}}]])
