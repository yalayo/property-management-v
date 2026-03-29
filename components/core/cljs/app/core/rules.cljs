(ns app.core.rules
  (:require [odoyle.rules :as o]))

(def rules
  (o/ruleset
   {
    ;; to register a pending onboarding of a tenant
    ::record-tenant-onboarding
    [:what
     [::onboarding-tenant ::id apartment]
     [::onboarding-tenant ::tenant tenant]
     [::onboarding-tenant ::email email]
     :then
     (println "Tenant onboarded, pending signup:" email)
     (o/insert! email ::apartment apartment)
     (o/insert! email ::tenant    tenant)
     (o/insert! email ::status    :awaiting-signup)]
    
    ;; query rule to read pending signups back out
    ::pending-tenant-signups
    [:what
     [email ::apartment apartment]
     [email ::tenant    tenant]
     [email ::status    :awaiting-signup]]}))

;; create session and add rule
(def *session
  (atom (reduce o/add-rule (o/->session) rules)))

(defn start-tenant-onboarding [apartment tenant email]
  (swap! *session
         (fn [session]
           (-> session
               (o/insert ::onboarding-tenant ::id apartment)
               (o/insert ::onboarding-tenant ::tenant tenant)
               (o/insert ::onboarding-tenant ::email email)  ;; <-- add this
               o/fire-rules))))

(comment
  "Adding a pending onboarding"
  (start-tenant-onboarding :apartment-2 :tenant-2 "tenant-2@mail.com")

  ;; Query pending onboardings
  (o/query-all @*session ::pending-tenant-signups)
  )