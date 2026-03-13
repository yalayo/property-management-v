(ns app.payment-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.payment-ui.views :as views]
            [app.payment-ui.events :as events]))

(defn component [props] [views/component props])

(defn select-tier [tier-id]
  (re-frame/dispatch [::events/select-tier tier-id]))
