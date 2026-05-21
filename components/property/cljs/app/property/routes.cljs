(ns app.property.routes
  (:require [app.property.handler :as handler]))

(defn create-routes [controller]
  [["/properties"
    {:get  {:handler (handler/get-properties controller)}
     :post {:handler (handler/create-property controller)}}]
   ["/properties/:id"
    {:put    {:handler (handler/update-property controller)}
     :delete {:handler (handler/delete-property controller)}}]])
