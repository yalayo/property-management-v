(ns app.core.interface
  (:require [integrant.core :as ig]
            [app.core.system :as core]))

(defmethod ig/init-key ::domain [_ _]
  (core/init))