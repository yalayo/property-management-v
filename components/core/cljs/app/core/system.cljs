(ns app.core.system
  (:require [app.core.rules.sign-up :as sign-up]
            [app.core.rules.sign-in :as sign-in]))

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
  "Pure command dispatcher. Takes a context map with :command :data :db-user :provided-hash.
  Returns a result map; no side effects."
  [{:keys [command data db-user provided-hash]}]
  (case command
    :user-sign-up
    (sign-up/validate {:email    (get data :email)
                       :name     (get data :name "")
                       :password (get data :password)
                       :db-user  db-user})

    :user-sign-in
    (sign-in/validate {:db-user       db-user
                       :provided-hash provided-hash})

    :create-property
    (let [{:keys [name address]} data]
      (if (or (nil? name) (nil? address))
        {:error :missing-required-fields}
        {:action :create-property
         :entity {:name             name
                  :address          address
                  :city             (get data :city)
                  :postal-code      (get data :postal-code)
                  :country          (or (get data :country) "Germany")
                  :units            (or (get data :units) 1)
                  :acquisition-date (get data :acquisition-date)
                  :purchase-price   (get data :purchase-price)
                  :current-value    (get data :current-value)}}))

    :update-property
    {:action  :update-property
     :updates {:name             (get data :name)
               :address          (get data :address)
               :city             (get data :city)
               :postal-code      (get data :postal-code)
               :country          (get data :country)
               :units            (get data :units)
               :purchase-price   (get data :purchase-price)
               :current-value    (get data :current-value)
               :iban                 (get data :iban)
               :bank-name            (get data :bank-name)
               :landlord-name        (get data :landlord-name)
               :landlord-street      (get data :landlord-street)
               :landlord-postal-city (get data :landlord-postal-city)}}

    :create-apartment
    (let [{:keys [property-id code]} data]
      (if (or (nil? property-id) (nil? code))
        {:error :missing-required-fields}
        {:action :create-apartment
         :entity {:property-id property-id
                  :code        code}}))

    :update-apartment
    {:action  :update-apartment
     :updates {:code     (get data :code)
               :occupied (get data :occupied)}}

    :create-tenant
    (let [{:keys [first-name last-name]} data]
      (if (or (nil? last-name) (= "" last-name))
        {:error :missing-required-fields}
        {:action :create-tenant
         :entity {:apartment-id       (get data :apartment-id)
                  :first-name         (or first-name "")
                  :last-name          last-name
                  :email              (or (get data :email) "")
                  :phone              (or (get data :phone) "")
                  :start-date         (or (get data :start-date) "")
                  :end-date           (or (get data :end-date) "")
                  :birthday           (get data :birthday)
                  :household-members  (get data :household-members)}}))

    :update-tenant
    {:action  :update-tenant
     :updates {:first-name        (get data :first-name)
               :last-name         (get data :last-name)
               :email             (get data :email)
               :phone             (get data :phone)
               :start-date        (get data :start-date)
               :end-date          (get data :end-date)
               :birthday          (get data :birthday)
               :household-members (get data :household-members)
               :kaltmiete         (get data :kaltmiete)
               :nebenkosten-warm  (get data :nebenkosten-warm)}}

    :start-onboarding
    (let [{:keys [apartment-id email]} data]
      (if (or (nil? apartment-id) (nil? email) (empty? email))
        {:error :missing-required-fields}
        {:action :start-onboarding
         :entity {:apartment-id apartment-id
                  :email        email}}))

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
