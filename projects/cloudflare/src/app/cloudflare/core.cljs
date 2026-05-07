(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.core.interface :as core]
            [app.storage.interface :as storage]
            [app.user.interface :as user]
            [app.survey.interface :as survey]
            [app.plans.interface :as plans]
            [app.property.interface  :as property]
            [app.apartment.interface :as apartment]
            [app.tenant.interface   :as tenant]
            [app.payment.interface :as payment]
            [app.dashboard.interface :as dashboard]))

;; ::storage/d1 receives {:db <D1-binding>} injected lazily on the first
;; incoming request (see ensure-started!), because env is only available
;; inside the fetch handler, not at module-load time.
(def config
  {::core/domain       {}
   ::storage/d1        {}
   ::user/routes       {:storage (ig/ref ::storage/d1)}
   ::survey/routes     {:storage (ig/ref ::storage/d1)}
   ::plans/routes      {:storage (ig/ref ::storage/d1)}
   ::property/routes   {:storage (ig/ref ::storage/d1)}
   ::apartment/routes  {:storage (ig/ref ::storage/d1)}
   ::tenant/routes     {:storage (ig/ref ::storage/d1)}
   ::payment/routes    {}
   ::dashboard/routes  {:storage (ig/ref ::storage/d1)}
   ::worker/handler    {:user-routes      (ig/ref ::user/routes)
                        :survey-routes    (ig/ref ::survey/routes)
                        :plans-routes     (ig/ref ::plans/routes)
                        :property-routes  (ig/ref ::property/routes)
                        :apartment-routes (ig/ref ::apartment/routes)
                        :tenant-routes    (ig/ref ::tenant/routes)
                        :payment-routes   (ig/ref ::payment/routes)
                        :dashboard-routes (ig/ref ::dashboard/routes)}})

(defonce system (atom nil))

(defn- ensure-started! [^js env]
  (when-not @system
    (reset! system
      (ig/init (assoc config ::storage/d1 {:db (aget env "DB")})))))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

;; Cloudflare Workers export — a JS object with a `fetch` method.
;; ensure-started! runs once on the first request, binding the live D1 handle.
(def handler
  #js {:fetch (fn [^js request ^js env ^js ctx]
                (ensure-started! env)
                ((.-fetch (::worker/handler @system)) request env ctx))})
