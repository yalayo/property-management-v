(ns app.worker.presence
  (:require ["cloudflare:workers" :refer [DurableObject]]
            [app.worker.async :refer [js-await]]
            [app.worker.durable-objects :as do]
            [app.worker.cf :as cf :refer [defclass]]))

(defclass ^{:extends DurableObject} PresenceDurableObject [ctx env]
  Object
  (constructor [this ctx env]
               (super ctx env))

  (add-user-presence+ [this id timestamp]
                      (js-await [_ (do/storage-put+ ctx id timestamp)
                                 users (do/storage-list+ ctx)
                                 now (js/Date.now)]
                                (doseq [[id _] (->> (cf/js->clj users)
                                                    (filter (fn [[id ts]] (> (- now ts) 10000))))]
                                  (do/storage-delete+ ctx id))
                                (do/storage-list+ ctx))))
