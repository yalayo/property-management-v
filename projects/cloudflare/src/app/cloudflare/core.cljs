(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.user.interface :as user]
            [app.survey.interface :as survey]
            [app.plans.interface :as plans]
            [app.property.interface  :as property]
            [app.apartment.interface :as apartment]))

(def config
  {::user/routes      {}
   ::survey/routes    {}
   ::plans/routes     {}
   ::property/routes  {}
   ::apartment/routes {}
   ::worker/handler {:user-routes      (ig/ref ::user/routes)
                     :survey-routes    (ig/ref ::survey/routes)
                     :plans-routes     (ig/ref ::plans/routes)
                     :property-routes  (ig/ref ::property/routes)
                     :apartment-routes (ig/ref ::apartment/routes)}})

(defonce system (atom nil))

(defn start []
  (reset! system (ig/init config)))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

(defn restart []
  (stop)
  (start))

(defn init []
  (start)
  (::worker/handler @system))

(def handler (init))
