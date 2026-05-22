(ns app.core-ui.core
  (:require
   [re-frame.core :as re-frame]
   [reagent.core :as r]
   ["react-dom/client" :as rdom]
   [app.core-ui.subs :as subs]
   [app.core-ui.events :as events]
   [app.core-ui.rules :as rules]
   [app.core-ui.views :as views]))

(defonce root (rdom/createRoot (.getElementById js/document "app")))

;; Keeps the odoyle session in sync with re-frame auth state.
(defonce auth-sync
  (delay
    (r/track!
     (fn []
       (rules/insert-facts!
        @(re-frame/subscribe [::subs/logged-in?])
        (keyword @(re-frame/subscribe [::subs/user-role])))))))

;; Keeps the odoyle session in sync with the current auth-form mode (login/register).
;; Needed so rules/form-command :auth can derive the correct command type.
(defonce auth-mode-sync
  (delay
    (r/track!
     (fn []
       (rules/set-auth-mode! @(re-frame/subscribe [::subs/auth-mode]))))))

(defn main-component [children]
  [views/component children])

(defn init [children]
  (re-frame/dispatch-sync [::events/initialize-db])
  (re-frame/dispatch-sync [::events/restore-nav])
  (force auth-sync)
  (force auth-mode-sync)
  (main-component children))