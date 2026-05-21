(ns app.letter.billing
  (:require [odoyle.rules :as o]))

(def ^:private readiness-rules
  (o/ruleset
    {::derive-readiness
     [:what
      [::apt :req/has-tenant?    ?has-tenant]
      [::apt :req/has-all-costs? ?has-costs]
      [::apt :req/has-payments?  ?has-payments]
      [::apt :req/has-iban?      ?has-iban]
      :then
      (let [missing (cond-> #{}
                      (not ?has-tenant)   (conj :tenant)
                      (not ?has-costs)    (conj :costs)
                      (not ?has-payments) (conj :payments)
                      (not ?has-iban)     (conj :iban))]
        (o/insert! ::apt :billing/ready?  (empty? missing))
        (o/insert! ::apt :billing/missing missing))]

     ::readiness-query
     [:what
      [::apt :billing/ready?  ?ready]
      [::apt :billing/missing ?missing]]}))

(defn- new-session []
  (reduce o/add-rule (o/->session) readiness-rules))

(defn check-readiness
  "Returns {:ready? bool :missing #{:tenant :costs :payments :iban}}"
  [{:keys [has-tenant? has-all-costs? has-payments? has-iban?]}]
  (let [session (-> (new-session)
                    (o/insert ::apt :req/has-tenant?    (boolean has-tenant?))
                    (o/insert ::apt :req/has-all-costs? (boolean has-all-costs?))
                    (o/insert ::apt :req/has-payments?  (boolean has-payments?))
                    (o/insert ::apt :req/has-iban?      (boolean has-iban?))
                    o/fire-rules)]
    (when-let [result (first (o/query-all session ::readiness-query))]
      {:ready?  (:?ready result)
       :missing (:?missing result)})))
