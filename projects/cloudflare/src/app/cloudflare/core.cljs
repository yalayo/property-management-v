(ns app.cloudflare.core
  (:require [integrant.core :as ig]
            [app.worker.core :as worker]
            [app.core.interface :as core]
            [app.controller.interface :as controller]
            [app.storage.interface :as storage]))

;; ::storage/d1 receives {:db <D1-binding>} injected lazily on the first
;; incoming request (see ensure-started!), because env is only available
;; inside the fetch handler, not at module-load time.
(def config
  {::core/domain {}
   ::storage/d1 {}
   ::controller/controller {:core    (ig/ref ::core/domain)
                             :storage (ig/ref ::storage/d1)}
   ::worker/handler {:core       (ig/ref ::core/domain)
                     :storage    (ig/ref ::storage/d1)
                     :controller (ig/ref ::controller/controller)}})

(defonce system (atom nil))

(defn- ensure-started! [^js env]
  (when-not @system
    (reset! system
      (ig/init (assoc config ::storage/d1 {:db (aget env "DB")})))))

(defn stop []
  (when @system
    (ig/halt! @system)
    (reset! system nil)))

;; Cloudflare Workers export — a JS object with a `fetch` method.
;; ensure-started! runs once on the first request, binding the live D1 handle.
(def handler
  #js {:fetch (fn [^js request ^js env ^js ctx]
                (ensure-started! env)
                ((.-fetch (::worker/handler @system)) request env ctx))})
