(ns app.core.system
  #_(:require [app.core.rules.service-request :as service-request]))

(def command->fn {})

(defn run [state commands]
  (reduce
   (fn [state {:keys [command args]}]
     (if-let [fn (get command->fn command)]
       (apply fn state args)
       (throw
        (ex-info (str "Unknown command: " command ", args:" args)
                 {:command command :arg args}))))
   state commands))

(defn process
  "Dispatch a command through the rules engine.
  Returns a vector of one event map ready for the storage layer."
  [cmd data]
  (case cmd
    :user-sign-up nil
    [{:type :error :data {:command cmd :reason :unknown-command}}]))

(defn init []
  (let [state (atom {})]
    {:state    state
     :dispatch (fn [cmd args]
                 (swap! state #(run % [{:command cmd :args args}])))
     :run      (fn [commands]
                 (swap! state run commands))
     :process  process}))

(defn stop [state]
  (reset! state {})
  nil)