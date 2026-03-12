(ns app.property.routes
  (:require [app.property.handler :as handler]))

(def routes
  [["/properties" {:get  {:handler handler/get-properties}
                   :post {:handler handler/create-property}}]])
