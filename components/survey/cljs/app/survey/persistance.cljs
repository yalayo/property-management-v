(ns app.survey.persistance
  (:require [app.storage.interface :as storage]
            [app.worker.async :refer [js-await]]))

(defn get-questions []
  (js-await [eids (storage/find-by-attr :question/active true)
             qs   (storage/pull-many eids [:question/text :question/sort-order])]
            (sort-by :question/sort-order qs)))

(defn save-survey-response [email responses]
  (storage/transact!
   [{:db/type                   "survey-response"
     :survey-response/email     email
     :survey-response/responses responses}]))
