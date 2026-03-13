(ns app.payment.routes
  (:require [app.payment.handler :as handler]))

(def routes
  [["/create-payment-intent" {:post {:handler handler/create-payment-intent}}]
   ["/register-after-payment" {:post {:handler handler/register-after-payment}}]])
