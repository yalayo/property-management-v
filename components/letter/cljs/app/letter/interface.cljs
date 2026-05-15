(ns app.letter.interface
  (:require [integrant.core :as ig]
            [app.letter.system :as core]))

(defmethod ig/init-key ::domain [_ _]
  (core/init))