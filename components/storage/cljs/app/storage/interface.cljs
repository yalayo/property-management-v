(ns app.storage.interface
  (:require [integrant.core :as ig]
            [app.storage.core :as core]))

(defmethod ig/init-key ::storage [_ _]
  routes/routes)