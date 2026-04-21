(ns app.core.rules.user
  (:require [odoyle.rules :as o]))

(def rules
  (o/ruleset
   {    ;; --- Onboarding registration (inserted from DB query results) -----------

    ::pending-tenant
    [:what
     [email ::role      :tenant]
     [email ::apartment apartment]
     [email ::status    :awaiting-signup]]

    ::pending-landlord
    [:what
     [email ::role   :landlord]
     [email ::status :awaiting-signup]]

    ;; --- Signup attempts ----------------------------------------------------

    ::tenant-signup
    [:what
     [::signup ::email email]
     [::signup ::name  name]
     [::signup ::role  :tenant]
     [email ::role      :tenant]
     [email ::apartment apartment]
     [email ::status    :awaiting-signup]
     :then
     (o/insert! ::events ::pending
                {:type :create-tenant-user
                 :data {:email     email
                        :name      name
                        :apartment apartment
                        :role      :tenant}})]

    ::landlord-signup
    [:what
     [::signup ::email email]
     [::signup ::name  name]
     [::signup ::role  :landlord]
     [email ::role   :landlord]
     [email ::status :awaiting-signup]
     :then
     (o/insert! ::events ::pending
                {:type :create-landlord-user
                 :data {:email email
                        :name  name
                        :role  :landlord}})]

    ::signup-not-allowed
    [:what
     [::signup ::email email]
     [::signup ::role  role]
     :when (and (empty? (o/query-all o/*session* ::pending-tenant))
                (empty? (o/query-all o/*session* ::pending-landlord)))
     :then
     (o/insert! ::events ::pending
                {:type :signup-rejected
                 :data {:email  email
                        :reason :no-pending-onboarding}})]

    ;; --- Event bus ----------------------------------------------------------

    ::events
    [:what
     [::events ::pending event]]}))

(defn- fresh-session []
  (reduce o/add-rule (o/->session) rules))

;; create session and add rule
(def *session
  (atom (fresh-session)))

(defn register-tenant-onboarding
  "Step 1 (landlord registers tenant). Returns event to persist to DB."
  [apartment tenant email]
  (let [session (-> @*session
                    (o/insert ::onboarding ::email     email)
                    (o/insert ::onboarding ::role      :tenant)
                    (o/insert ::onboarding ::apartment apartment)
                    (o/insert ::onboarding ::tenant    tenant)
                    o/fire-rules)]
    {:type :register-onboarding
     :data {:email     email
            :role      :tenant
            :apartment apartment
            :tenant    tenant
            :status    :awaiting-signup}}))


(defn start-tenant-onboarding [apartment tenant email]
  (swap! *session
         (fn [session]
           (-> session
               (o/insert ::onboarding-tenant ::id apartment)
               (o/insert ::onboarding-tenant ::tenant tenant)
               (o/insert ::onboarding-tenant ::email email)  ;; <-- add this
               o/fire-rules))))

(defn start-landlord-onboarding [email]
  (swap! *session
         (fn [session]
           (-> session
               (o/insert ::onboarding-landlord ::email email)  ;; <-- add this
               o/fire-rules))))

(comment
  "Adding a pending onboarding"
  (start-tenant-onboarding :apartment-2 :tenant-2 "tenant-2@mail.com")

  (start-landlord-onboarding "landlord-1@mail.com")

  ;; Query pending onboardings
  (o/query-all @*session ::pending-tenant-signups)

  ;; Query pending onboardings
  (o/query-all @*session ::pending-landlord-signups)

  ;; Trying another approach
  (register-tenant-onboarding :apartment-1 :tenant-1 "tenant-1@gmail.com")

  ;; Query pending tenant onboardings
  (o/query-all @*session ::pending-tenant)

  ;; Query pending events to be processed afterwards
  (o/query-all @*session ::events)
  )