(ns app.web.core
  (:require [integrant.core :as ig]
            #_[reagent.dom :as rdom] 
            [re-frame.core :as re-frame]
            [reagent.core :as r]
            ["react-dom/client" :as rdom]
            [app.web.interceptors :as interceptors]
            [app.auth-ui.interface :as auth]
            [app.web.events :as events] 
            [app.web.views :as views]))

(def config 
  {::interceptors/storage {}
   ::auth/component {:local-storage (ig/ref ::interceptors/storage)}})

(defonce system (atom nil))
(defonce root (rdom/createRoot (.getElementById js/document "app")))

(defn start []
  (reset! system (ig/init config)))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

(defn restart []
  (stop)
  (start))
  
(defn ^:dev/after-load mount-root []
  (re-frame/clear-subscription-cache!)
  (.render root (r/as-element [views/platform-component])))
  
(defn init []
  #_(start)
  (re-frame/dispatch-sync [::events/initialize-db])
  (mount-root))

(defn ^:dev/after-load mount-home []
  (re-frame/clear-subscription-cache!)
  (.render root (r/as-element [views/home-component])))

(defn home []
  (re-frame/dispatch-sync [::events/initialize-db])
  (mount-home))