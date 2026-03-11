(ns app.survey-ui.interface
  (:require [integrant.core :as ig]
            [app.survey-ui.views :as views]))

(defmethod ig/init-key ::component [_ _]
  views/component)
