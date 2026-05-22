(ns app.web.core
  (:require [integrant.core :as ig]
            [re-frame.core :as re-frame]
            [reagent.core :as r]
            ["react-dom/client" :as rdom]))

(defonce root (rdom/createRoot (.getElementById js/document "app")))

(defn mount-root [core-ui]
  (re-frame/clear-subscription-cache!)
  (.render root (r/as-element core-ui)))

(defn init [core-ui]
  (mount-root core-ui))

(defmethod ig/init-key ::entry-point [_ {:keys [core-ui]}]
  (init core-ui))