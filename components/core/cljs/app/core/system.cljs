(ns app.core.system
  (:require [app.core.rules :as rules]))

(def command->fn
  {})

(defn run [state commands]
  (reduce
   (fn [state {:keys [command args]}]
     (if-let [fn (get command->fn command)]
       (apply fn state args)
       (throw
        (ex-info (str "Unknown command: " command ", args:" args)
                 {:command command :arg args}))))
   state commands))

(defn init []
  (let [state (atom {})]
    ;; Optional helper for dispatching commands safely
    {:state    state
     :dispatch (fn [cmd args]
                 (swap! state
                        #(run % [{:command cmd :args args}])))
     :run      (fn [commands]
                 (swap! state run commands))}))

(defn stop [state]
  (reset! state {})
  nil)