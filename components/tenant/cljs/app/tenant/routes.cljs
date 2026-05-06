(ns app.tenant.routes
  (:require [app.tenant.handler :as handler]))

(defn make-routes [storage]
  [["/tenants"
    {:get  {:handler (partial handler/get-tenants storage)}
     :post {:handler (partial handler/create-tenant storage)}}]
   ["/tenants/:id"
    {:put    {:handler (partial handler/update-tenant storage)}
     :delete {:handler (partial handler/delete-tenant storage)}}]
   ["/tenants/by-apartment/:apartment-id"
    {:get {:handler (partial handler/get-tenants-by-apartment storage)}}]])
