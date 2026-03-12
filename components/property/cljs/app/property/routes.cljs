(ns app.property.routes
  (:require [app.property.handler :as handler]))

(def routes
  [["/properties" {:get  {:handler handler/get-properties}
                   :post {:handler handler/create-property}}]
   ["/properties/:id" {:put    {:handler handler/update-property}
                       :delete {:handler handler/delete-property}}]])
