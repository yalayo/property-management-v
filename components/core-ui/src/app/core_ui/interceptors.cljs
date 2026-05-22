(ns app.core-ui.interceptors
  (:require [re-frame.core :as re-frame :refer [after]]
            [app.core-ui.db :as db]))

;; Initializing
;; Interceptors
(def ->local-store (after db/db->local-store))