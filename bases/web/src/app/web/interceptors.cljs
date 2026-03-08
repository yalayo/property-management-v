(ns app.web.interceptors
  (:require [integrant.core :as ig]
            [re-frame.core :as re-frame :refer [after]]
            [app.web.db :as db]))

;; Initializing
;; Interceptors
(def ->local-store (after db/db->local-store))

(defmethod ig/init-key ::storage [_ {:keys []}]
  ->local-store)