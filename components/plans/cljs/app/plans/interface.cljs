(ns app.plans.interface
  (:require [integrant.core :as ig]
            [app.plans.routes :as routes]))

;; Storage is initialized before this key runs (via ig/ref in the project config).
;; Handlers call storage/... directly — no need to thread storage through routes.
(defmethod ig/init-key ::routes [_ _]
  routes/routes)
