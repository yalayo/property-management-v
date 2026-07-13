(ns app.controller.features
  "Pure feature-flag logic — no storage, no promises. Kept side-effect free so
  it can be unit- and property-tested (test.check/fugato) directly.")

(def canonical-features
  "The feature catalog extracted from the app's existing capabilities. Seeded into
  the DB on first access; the super admin can add more later via the admin panel.
  Section keys mirror the dashboard nav/permission section ids as `section-<id>`."
  [{:key "section-overview"    :name "Übersicht"            :category "section" :description "Dashboard-Übersicht"}
   {:key "section-properties"  :name "Immobilien"           :category "section" :description "Immobilienverwaltung"}
   {:key "section-apartments"  :name "Wohnungen"            :category "section" :description "Wohnungsverwaltung"}
   {:key "section-tenants"     :name "Mieter"               :category "section" :description "Mieterverwaltung"}
   {:key "section-bank"        :name "Kontoauszug"          :category "section" :description "Bankkonten & Kontoauszüge"}
   {:key "section-abrechnung"  :name "Abrechnung"           :category "section" :description "Nebenkostenabrechnung"}
   {:key "section-expenses"    :name "Kostenarten"          :category "section" :description "Kostenarten"}
   {:key "section-documents"   :name "Dokumente"            :category "section" :description "Dokumentenverwaltung"}
   {:key "section-analytics"   :name "Analysen"             :category "section" :description "Auswertungen & Analysen"}
   {:key "section-tax"         :name "Steuer (Anlage V)"    :category "section" :description "Steuer / Anlage V"}
   {:key "section-finances"    :name "Einnahmen & Ausgaben" :category "section" :description "Sonstige Einnahmen & Ausgaben"}
   {:key "section-accounting"  :name "Buchhaltung"          :category "section" :description "Buchhaltung"}
   {:key "landing-page"        :name "Landing-Page"         :category "module"  :description "Öffentliche Landing-Page. Deaktiviert: Besucher sehen zuerst den Login."}
   {:key "team-management"     :name "Teamverwaltung"       :category "module"  :description "Teammitglieder einladen und verwalten"}
   {:key "trial-system"        :name "Testphase"            :category "module"  :description "Kostenlose Testphase (Pausieren/Fortsetzen)"}
   {:key "survey"              :name "Umfrage"              :category "module"  :description "Landing-Page-Umfrage"}
   {:key "data-export-import"  :name "Datenexport/-import"  :category "module"  :description "EDN-Export und -Import"}
   {:key "impersonation"       :name "Nutzer-Ansicht"       :category "module"  :description "Als Nutzer anmelden (View as)"}])

(defn feature-effective?
  "A feature is on for an org iff the global master switch is on AND the per-org
  override says on (or, absent an override, the feature's default)."
  [feature override]
  (boolean
   (and (:feature/enabled feature)
        (if override
          (:feature-override/enabled override)
          (:feature/default-on feature)))))

(defn overrides-by-key
  "Index a seq of feature-override entities by their feature key."
  [overrides]
  (into {} (map (fn [o] [(:feature-override/feature-key o) o]) overrides)))

(defn resolve-enabled
  "Given the feature entities and the org's override entities, return the vector
  of feature keys that are effectively enabled for that org."
  [features overrides]
  (let [ov (overrides-by-key overrides)]
    (->> features
         (filter (fn [f] (feature-effective? f (get ov (:feature/key f)))))
         (mapv :feature/key))))

(def command->feature
  "Mutation commands gated by an org-level feature. Reads stay open (the UI hides
  disabled sections; cross-section views may still need reads), mirroring how
  trial gating only guards creates. Absent mapping ⇒ command is never gated."
  {;; section-properties
   :create-property                "section-properties"
   :update-property                "section-properties"
   :delete-property                "section-properties"
   :create-cost                    "section-properties"
   :update-cost                    "section-properties"
   :delete-cost                    "section-properties"
   ;; section-apartments
   :create-apartment               "section-apartments"
   :update-apartment               "section-apartments"
   :delete-apartment               "section-apartments"
   :create-garage                  "section-apartments"
   :update-garage                  "section-apartments"
   :delete-garage                  "section-apartments"
   :assign-tenant-to-garage        "section-apartments"
   :unassign-tenant-from-garage    "section-apartments"
   :create-garage-payment          "section-apartments"
   :delete-garage-payment          "section-apartments"
   :create-rent-payment            "section-apartments"
   :update-rent-payment            "section-apartments"
   :delete-rent-payment            "section-apartments"
   :create-apartment-cost          "section-apartments"
   :update-apartment-cost          "section-apartments"
   :delete-apartment-cost          "section-apartments"
   ;; section-tenants
   :create-tenant                  "section-tenants"
   :update-tenant                  "section-tenants"
   :delete-tenant                  "section-tenants"
   :assign-tenant-to-apartment     "section-tenants"
   :upsert-tenant-miete            "section-tenants"
   :delete-tenant-miete            "section-tenants"
   :create-residents-count-change  "section-tenants"
   :delete-residents-count-change  "section-tenants"
   :start-onboarding               "section-tenants"
   ;; section-abrechnung
   :create-nebenkosten-settlement  "section-abrechnung"
   :delete-nebenkosten-settlement  "section-abrechnung"
   :upsert-nk-outstanding          "section-abrechnung"
   :delete-nk-outstanding          "section-abrechnung"
   ;; section-expenses
   :create-expense-type            "section-expenses"
   :update-expense-type            "section-expenses"
   :delete-expense-type            "section-expenses"
   ;; section-tax
   :upsert-property-tax-config     "section-tax"
   :create-property-loan           "section-tax"
   :update-property-loan           "section-tax"
   :delete-property-loan           "section-tax"
   :create-property-maintenance    "section-tax"
   :update-property-maintenance    "section-tax"
   :delete-property-maintenance    "section-tax"
   ;; section-finances
   :create-tax-income              "section-finances"
   :delete-tax-income              "section-finances"
   :create-tax-expense             "section-finances"
   :delete-tax-expense             "section-finances"
   ;; section-accounting
   :create-journal-entry           "section-accounting"
   :storno-journal-entry           "section-accounting"
   :complete-accounting-onboarding "section-accounting"
   ;; section-bank
   :create-bank-account            "section-bank"
   :update-bank-account            "section-bank"
   :delete-bank-account            "section-bank"
   ;; modules
   :create-org-user                "team-management"
   :update-org-user-sections       "team-management"
   :delete-org-user                "team-management"
   :pause-trial                    "trial-system"
   :resume-trial                   "trial-system"})

(defn resolve-public
  "Effective feature keys for UNAUTHENTICATED visitors (no org → no overrides):
  a stored feature is on iff master switch AND default-on. Canonical features
  missing from storage count as ON, so an unseeded database keeps the default
  behaviour (e.g. the landing page stays visible)."
  [stored-features]
  (let [stored-keys (set (map :feature/key stored-features))
        from-db     (resolve-enabled stored-features [])
        missing     (->> canonical-features
                         (map :key)
                         (remove stored-keys))]
    (vec (concat from-db missing))))

(defn feature-blocked?
  "Pure resolution used by the dispatch gate: true only when the feature entity
  exists and resolves to off for this org. Missing catalog data ⇒ enabled, so an
  unseeded database can never lock users out."
  [feature override]
  (if (nil? feature)
    false
    (not (feature-effective? feature override))))
