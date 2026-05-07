(ns app.worker.handler
  (:require
   [app.worker.async :refer [js-await]]
   [app.worker.cf :as cf]))

(defn command
  "Returns a Reitit route handler that dispatches {:command kw :data map}
  to the matching fn in command-handlers. Called once at Integrant init time."
  [command-handlers]
  (fn [{:keys [request env]}]
    (js-await [body (cf/request->edn request)]
              (let [{:keys [command data]} body
                    handler (get command-handlers command)]
                (if handler
                  (handler env data)
                  (cf/response-edn {:error "Unknown command" :command command} {:status 400}))))))