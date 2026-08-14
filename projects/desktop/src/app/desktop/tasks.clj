(ns app.desktop.tasks
  "Port of PendingTasksWidget.tsx's computeTasks (the German tax/Nebenkosten
  compliance checklist) — same checks, same priorities, same task ids, just
  operating on our namespaced-keyword entity maps (:property/name,
  :apartment/property-id, ...) instead of the frontend's flat/kebab-string
  keys (property.name, apt[\"property-id\"]). Pure: no I/O, no side effects,
  easy to fixture-test.

  Interactive fixing (the ~12 'Eingeben' modals in the original widget) is
  explicitly out of scope for this port — see the plan's Phase S5. This only
  computes and reports what's missing."
  (:require [clojure.string :as str])
  (:import [java.time LocalDate]))

;; ---------------------------------------------------------------------------
;; Helpers
;; ---------------------------------------------------------------------------

(defn- not-blank? [v]
  (and (some? v) (not (str/blank? (str v)))))

(defn- as-int [x]
  (when (some? x) (long x)))

(defn- parse-date ^LocalDate [s]
  (when (not-blank? s)
    (LocalDate/parse (str s))))

(defn- last-day-of-month ^LocalDate [year month]
  (let [first-of-month (LocalDate/of (int year) (int month) 1)]
    (.withDayOfMonth first-of-month (.lengthOfMonth first-of-month))))

(defn- tenant-active-months
  "Months (1-12) in `year` during which the tenancy overlaps it."
  [tenant year]
  (let [year-start (LocalDate/of (int year) 1 1)
        year-end   (LocalDate/of (int year) 12 31)
        t-start    (or (parse-date (:tenant/start-date tenant)) year-start)
        t-end      (or (parse-date (:tenant/end-date tenant)) year-end)]
    (vec (for [m (range 1 13)
               :when (and (not (.isAfter t-start (last-day-of-month year m)))
                          (not (.isBefore t-end (LocalDate/of (int year) (int m) 1))))]
           m))))

(defn- eid= [eid v]
  (= (str eid) (str v)))

;; ---------------------------------------------------------------------------
;; compute-tasks
;; ---------------------------------------------------------------------------

(defn compute-tasks
  "ctx: {:properties :apartments :tenants :costs :apartment-costs
  :rent-payments :garages :garage-payments :tax-configs} — vectors of pulled
  entity maps (as returned by app.storage.sqlite/pull-many).
  Returns {:tasks [...sorted by :priority...] :total-checks n :passed-checks n}."
  [{:keys [properties apartments tenants costs apartment-costs rent-payments
           garages garage-payments tax-configs]}
   year]
  (let [tasks           (atom [])
        total-checks    (atom 0)
        passed-checks   (atom 0)
        now             (LocalDate/now)
        ;; Payments are only expected for months that have already fully
        ;; elapsed: for the current year that's Jan..(current month - 1), for
        ;; past years the whole year.
        max-paid-month  (if (= year (.getYear now)) (dec (.getMonthValue now)) 12)
        year-start      (LocalDate/of (int year) 1 1)
        year-end        (LocalDate/of (int year) 12 31)
        check!          (fn [passing? task]
                           (swap! total-checks inc)
                           (if passing?
                             (swap! passed-checks inc)
                             (swap! tasks conj task)))
        active-tenants-for
        (fn [apt-id]
          (filter (fn [t]
                    (and (eid= (:tenant/apartment-id t) apt-id)
                         (let [s (parse-date (:tenant/start-date t))
                               e (parse-date (:tenant/end-date t))]
                           (and (or (nil? s) (not (.isAfter s year-end)))
                                (or (nil? e) (not (.isBefore e year-start)))))))
                  tenants))]

    (doseq [property properties]
      (let [prop-id           (str (:db/id property))
            prop-name         (or (:property/name property) prop-id)
            property-apts     (filter #(eid= (:apartment/property-id %) prop-id) apartments)
            property-rented?  (boolean (some #(seq (active-tenants-for (:db/id %))) property-apts))]

        ;; ── Steuer checks ──────────────────────────────────────────────────
        (check! (not-blank? (:property/acquisition-date property))
                {:id (str "steuer-" prop-id "-acquisition-date") :category :steuer :type :missing-acquisition-date
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 20})
        (check! (some? (:property/land-value property))
                {:id (str "steuer-" prop-id "-land-value") :category :steuer :type :missing-land-value
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 21})
        (check! (some? (:property/building-value property))
                {:id (str "steuer-" prop-id "-building-value") :category :steuer :type :missing-building-value
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 22})
        (check! (some? (:property/ownership-share property))
                {:id (str "steuer-" prop-id "-ownership-share") :category :steuer :type :missing-ownership-share
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 23})
        (check! (some? (:property/year-built property))
                {:id (str "steuer-" prop-id "-year-built") :category :steuer :type :missing-year-built
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 24})
        (check! (not-blank? (:property/usage property))
                {:id (str "steuer-" prop-id "-usage") :category :steuer :type :missing-usage
                 :property-id prop-id :property-name prop-name :navigate-to :properties :priority 25})

        (let [tax-config (some #(when (eid= (:property-tax-config/property-id %) prop-id) %) tax-configs)]
          (check! (some? (:property-tax-config/building-value tax-config))
                  {:id (str "steuer-" prop-id "-afa-config") :category :steuer :type :missing-afa-config
                   :property-id prop-id :property-name prop-name :navigate-to :tax :priority 26}))

        (let [has-property-costs? (boolean (some #(and (eid= (:cost/property-id %) prop-id)
                                                        (= (as-int (:cost/year %)) year))
                                                  costs))]

          ;; ── Property-level Nebenkosten checks — only meaningful if let ────
          (when property-rented?
            (check! (not-blank? (:property/iban property))
                    {:id (str "nk-" prop-id "-iban") :category :nebenkosten :type :missing-iban
                     :property-id prop-id :property-name prop-name :navigate-to :properties :priority 10})
            (check! has-property-costs?
                    {:id (str "nk-" prop-id "-costs-" year) :category :nebenkosten :type :missing-property-costs
                     :property-id prop-id :property-name prop-name :navigate-to :properties :priority 13}))

          ;; ── Per-apartment checks ──────────────────────────────────────────
          (doseq [apt property-apts]
            (let [apt-id   (str (:db/id apt))
                  apt-code (or (:apartment/code apt) apt-id)]

              (check! (some? (:apartment/wohnflaeche apt))
                      {:id (str "nk-" apt-id "-wohnflaeche") :category :nebenkosten :type :missing-wohnflaeche
                       :property-id prop-id :property-name prop-name :apt-code apt-code :apt-id apt-id :apt-tab :info
                       :navigate-to :apartments :priority 7})

              (let [apt-tenants (active-tenants-for (:db/id apt))]
                (check! (or (seq apt-tenants) (true? (:apartment/leerstand apt)))
                        {:id (str "nk-" apt-id "-tenant-" year) :category :nebenkosten :type :missing-tenant
                         :property-id prop-id :property-name prop-name :apt-code apt-code :apt-id apt-id :apt-tab :tenants
                         :navigate-to :apartments :priority 8})

                (when (seq apt-tenants)
                  (check! (not-blank? (:apartment/market-rent apt))
                          {:id (str "steuer-" apt-id "-market-rent") :category :steuer :type :missing-market-rent
                           :property-id prop-id :property-name prop-name :apt-code apt-code :apt-id apt-id :apt-tab :info
                           :navigate-to :apartments :priority 27})

                  (let [active-months  (->> apt-tenants
                                             (mapcat #(tenant-active-months % year))
                                             (filter #(<= % max-paid-month))
                                             set)
                        paid-months    (->> rent-payments
                                             (filter #(and (eid= (:rent-payment/apartment-id %) apt-id)
                                                           (= (as-int (:rent-payment/year %)) year)))
                                             (keep #(as-int (:rent-payment/month %)))
                                             set)
                        missing-months (vec (sort (remove paid-months active-months)))]
                    (when (seq active-months)
                      (check! (empty? missing-months)
                              {:id (str "nk-" apt-id "-rent-" year) :category :nebenkosten :type :missing-rent-payments
                               :property-id prop-id :property-name prop-name :apt-code apt-code :apt-id apt-id :apt-tab :rent
                               :navigate-to :apartments :priority 11 :missing-months missing-months})))

                  (let [apt-cost-type (if has-property-costs? :missing-apt-allocation :missing-apt-costs)
                        all-costs-covered?
                        (if has-property-costs?
                          (let [prop-lines (->> costs
                                                 (filter #(and (eid= (:cost/property-id %) prop-id)
                                                               (= (as-int (:cost/year %)) year)))
                                                 (map #(str (:cost/line %))))
                                apt-lines  (->> apartment-costs
                                                (filter #(and (eid= (:apartment-cost/apartment-id %) apt-id)
                                                              (= (as-int (:apartment-cost/year %)) year)))
                                                (map #(str (:apartment-cost/line %)))
                                                set)]
                            (every? apt-lines prop-lines))
                          (boolean (some #(and (eid= (:apartment-cost/apartment-id %) apt-id)
                                               (= (as-int (:apartment-cost/year %)) year))
                                         apartment-costs)))]
                    (check! all-costs-covered?
                            {:id (str "nk-" apt-id "-aptcosts-" year) :category :nebenkosten :type apt-cost-type
                             :property-id prop-id :property-name prop-name :apt-code apt-code :apt-id apt-id :apt-tab :costs
                             :navigate-to :apartments :priority 12}))))))

          ;; ── Garage rent payments ──────────────────────────────────────────
          (doseq [garage (filter #(eid= (:garage/property-id %) prop-id) garages)]
            (let [garage-id   (str (:db/id garage))
                  garage-code (or (:garage/code garage) garage-id)
                  rent        (or (:garage/monthly-rent garage) 0)
                  rented?     (or (some? (:garage/tenant-id garage)) (true? (:garage/occupied garage)))]
              (when (and rented? (pos? rent) (>= max-paid-month 1))
                (let [paid    (->> garage-payments
                                   (filter #(and (eid= (:garage-payment/garage-id %) garage-id)
                                                 (= (as-int (:garage-payment/year %)) year)))
                                   (keep #(as-int (:garage-payment/month %)))
                                   set)
                      missing (vec (remove paid (range 1 (inc max-paid-month))))]
                  (check! (empty? missing)
                          {:id (str "nk-" garage-id "-garage-rent-" year) :category :nebenkosten :type :missing-garage-payments
                           :property-id prop-id :property-name prop-name :garage-id garage-id :garage-code garage-code
                           :garage-rent rent :navigate-to :apartments :priority 11 :missing-months missing}))))))))

    ;; ── Per-tenant completeness checks ─────────────────────────────────────
    (doseq [tenant tenants]
      (let [tenant-id   (str (:db/id tenant))
            joined-name (str/trim (str (:tenant/first-name tenant) " " (:tenant/last-name tenant)))
            tenant-name (if (str/blank? joined-name) tenant-id joined-name)
            s           (parse-date (:tenant/start-date tenant))
            e           (parse-date (:tenant/end-date tenant))]
        (when-not (or (and s (.isAfter s year-end)) (and e (.isBefore e year-start)))
          (let [apt-id    (some-> (:tenant/apartment-id tenant) str)
                apt       (some #(when (eid= (:db/id %) apt-id) %) apartments)
                apt-code  (or (:apartment/code apt) apt-id "")
                prop-id   (some-> apt :apartment/property-id str)
                prop-name (or (some #(when (eid= (:db/id %) prop-id) (:property/name %)) properties) prop-id)
                base {:category :nebenkosten :property-id prop-id :property-name prop-name :apt-code apt-code
                      :apt-id apt-id :tenant-id tenant-id :tenant-name tenant-name :navigate-to :apartments}]
            (check! (not-blank? (:tenant/start-date tenant))
                    (merge base {:id (str "t-" tenant-id "-startdate") :type :missing-tenant-startdate :apt-tab :tenants :priority 5}))
            (check! (and (not-blank? (:tenant/kaltmiete tenant)) (not-blank? (:tenant/nebenkosten-warm tenant)))
                    (merge base {:id (str "t-" tenant-id "-miete") :type :missing-tenant-miete :apt-tab :tenants :priority 6}))
            (check! (not-blank? (:tenant/residents-count tenant))
                    (merge base {:id (str "t-" tenant-id "-personenzahl") :type :missing-tenant-personenzahl :apt-tab :tenants :priority 6}))))))

    {:tasks         (vec (sort-by :priority @tasks))
     :total-checks  @total-checks
     :passed-checks @passed-checks}))
