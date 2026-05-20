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

(defn- sign-up [{:keys [data db-user]}]
  (if db-user
    {:error :user-already-exists}
    {:action    :create-user
     :user-data {:email    (get data :email)
                 :name     (get data :name "")
                 :password (get data :password)}}))

(defn process
  "Pure command dispatcher. Takes a context map with :command :data :user :db-user.
  Returns a result map; no side effects."
  [{:keys [command] :as ctx}]
  (case command
    :user-sign-up (sign-up ctx)
    {:error :unknown-command}))

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