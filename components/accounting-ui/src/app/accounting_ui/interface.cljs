(ns app.accounting-ui.interface
  (:require [re-frame.core :as re-frame]
            [app.accounting-ui.events :as events]
            [app.accounting-ui.subs]))

(defn load-journal-entries []
  (re-frame/dispatch [::events/load-journal-entries]))

(defn create-journal-entry [data]
  (re-frame/dispatch [::events/create-journal-entry data]))

(defn storno-journal-entry [id]
  (re-frame/dispatch [::events/storno-journal-entry id]))
