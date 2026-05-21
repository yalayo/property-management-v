(ns app.tenant.routes
  (:require [app.tenant.handler :as handler]))

(defn create-routes [controller]
  [["/tenants"
    {:get  {:handler (handler/get-tenants controller)}
     :post {:handler (handler/create-tenant controller)}}]
   ["/tenants/:id"
    {:put    {:handler (handler/update-tenant controller)}
     :delete {:handler (handler/delete-tenant controller)}}]
   ["/tenants/by-apartment/:apartment-id"
    {:get {:handler (handler/get-tenants-by-apartment controller)}}]])
