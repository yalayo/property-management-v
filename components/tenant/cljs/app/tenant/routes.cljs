(ns app.tenant.routes
  (:require [app.tenant.handler :as handler]))

(def routes
  [["/tenants"
    {:get  {:handler handler/get-tenants}
     :post {:handler handler/create-tenant}}]
   ["/tenants/:id"
    {:put    {:handler handler/update-tenant}
     :delete {:handler handler/delete-tenant}}]
   ["/tenants/by-apartment/:apartment-id"
    {:get {:handler handler/get-tenants-by-apartment}}]])
