(ns app.letter.rules
 (:require [odoyle.rules :as o]))

;; ─── Schema of facts ──────────────────────────────────────────────────────────
;; Each "piece" that arrives is inserted as a typed fact.
;; O'Doyle derives :billing/summary when enough facts exist.

(def rules
  (o/ruleset 
    {::tenant-share ;; Derive tenant-share for each cost line
     [:what
      [id :cost-line/name    ?name]
      [id :cost-line/total   ?total]
      [id :cost-line/pct     ?pct]
      [id :cost-line/key     ?key]
      [id :cost-line/sqm-pct ?sqm-pct]
      :then
      (let [share (* ?total (* ?pct 0.01) (* ?sqm-pct 0.01))]
        (o/insert! id :cost-line/share share))]
     
     ::tenant-share-query
     [:what
      [id :cost-line/name    ?name]
      [id :cost-line/total   ?total]
      [id :cost-line/pct     ?pct]
      [id :cost-line/key     ?key]
      [id :cost-line/sqm-pct ?sqm-pct]
      [id :cost-line/share   ?share]]

     ;; Derive billing summary when all required top-level facts exist
     ::billing-summary
     [:what
      [::billing :billing/tenant-id   ?tenant-id]
      [::billing :billing/last-name   ?last-name]
      [::billing :billing/street      ?street]
      [::billing :billing/location    ?location]
      [::billing :billing/prepayment  ?prepayment]
      [::billing :billing/heating-costs ?heating-costs]
      :then
      ;; total-costs and total are derived, not inserted directly
      ;; they'll be computed in the query
      (o/insert! ::billing :billing/complete? true)]

     ;; Business rule: refund iff tenant overpaid
     ::refund-rule
     [:what
      [::billing :billing/complete? true]
      [::billing :billing/prepayment ?prepayment]
      [::billing :billing/total-costs ?total-costs]
      :then
      (o/insert! ::billing :billing/refund (> ?prepayment ?total-costs))]}))

;; ─── Session management ───────────────────────────────────────────────────────

(defn new-session []
  (reduce o/add-rule (o/->session) rules))

(defn insert-tenant-info [session info]
  (-> session
      (o/insert ::billing :billing/tenant-id    (:tenant-id info))
      (o/insert ::billing :billing/last-name    (:last-name info))
      (o/insert ::billing :billing/street       (:street info))
      (o/insert ::billing :billing/location     (:location info))
      (o/insert ::billing :billing/prepayment   (:prepayment info))
      (o/insert ::billing :billing/heating-costs (:heating-costs info))
      o/fire-rules))

(defn insert-cost-line [session {:keys [id name total pct key sqm-pct]}]
  (-> session
      (o/insert id :cost-line/name    name)
      (o/insert id :cost-line/total   total)
      (o/insert id :cost-line/pct     pct)
      (o/insert id :cost-line/key     key)
      (o/insert id :cost-line/sqm-pct sqm-pct)
      o/fire-rules))

(defn insert-cost-lines [session lines]
  (reduce insert-cost-line session lines))

;; ─── Queries ──────────────────────────────────────────────────────────────────

(defn query-cost-lines [session]
  (->> (o/query-all session ::tenant-share-query)
       (map (fn [{:keys [?name ?total ?pct ?key ?sqm-pct ?share]}]
              {:1 ?name
               :2 ?total
               :3 ?pct
               :4 ?key
               :5 ?sqm-pct
               :6 ?share}))))

(defn query-billing [session]
  (when-let [summary (first (o/query-all session ::billing-summary))]
    (let [{:keys [?tenant-id ?last-name ?street ?location
                  ?prepayment ?heating-costs]} summary
          content      (query-cost-lines session)
          total-costs  (->> content (map :6) (reduce + 0))
          total        (- total-costs ?prepayment)]
      {:tenant-id     ?tenant-id
       :last-name     ?last-name
       :street        ?street
       :location      ?location
       :prepayment    ?prepayment
       :heating-costs ?heating-costs
       :total-costs   total-costs
       :total         total
       :refund        (> ?prepayment total-costs)
       :headers       '("Abrechnungsposten" "Gesamtkosten"
                        "Vert.Kst" "Schlüssel" "Anteilig" "Ihr Anteil")
       :content       content})))

(comment
  (def session (new-session))
  (def state {:tenant-info {:tenant-id "302d3365-e7fe-4875-b1f0-8b4ba52d6281",
                            :last-name "Brusberg",
                            :street "Kunigundastr.20",
                            :location "45131 Essen",
                            :prepayment 100.35,
                            :heating-costs 13.0}
              :cost-lines  [{:id :line/strom        :name "Allgemeinstrom"    :total 286.73   :pct 100.0 :key "Whfl." :sqm-pct 4.1}
                            {:id :line/versicherung :name "Versicherung"      :total 4125.35  :pct 100.0 :key "Whfl." :sqm-pct 4.1}
                            {:id :line/grundsteuer  :name "Grundsteuer"       :total 4244.38  :pct 100.0 :key "Whfl." :sqm-pct 4.1}
                            {:id :line/muell        :name "Müllabfuhr"        :total 2899.2   :pct 100.0 :key "Whfl." :sqm-pct 4.1}
                            {:id :line/trinkwasser  :name "Trinkwasser"       :total 1950.0   :pct 100.0 :key "Whfl." :sqm-pct 4.1}]           
              :complete?   false})
  
  (def session
    (-> (new-session)
        (insert-tenant-info (:tenant-info state))
        (insert-cost-lines (:cost-lines state))))
  
  (o/query-all session ::tenant-share-query)
  (query-cost-lines session)

  (query-billing session)
  )