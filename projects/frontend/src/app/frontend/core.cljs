(ns app.frontend.core
  (:require [integrant.core :as ig]
            [app.web.core :as web]
            [app.core-ui.interface :as core]
            [app.landing-ui.interface :as landing]
            [app.auth-ui.interface :as auth]
            [app.register-ui.interface :as register]))

(def config
  {::landing/component {}
   ::auth/component {}
   ::register/component {}
   ::core/component {:landing-page (ig/ref ::landing/component)
                     :auth-page (ig/ref ::auth/component)
                     :register-page (ig/ref ::register/component)}
   ::web/entry-point {:core-ui (ig/ref ::core/component)}})

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
  (start))
