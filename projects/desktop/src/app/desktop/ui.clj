(ns app.desktop.ui
  "Login + Properties screens. `root` is the single reactive component passed
  to ui/window — it's the one reactive boundary for the whole app, so every
  signal dereffed anywhere in its call tree (login-screen, properties-screen,
  property-row — none of which wrap themselves in their own reactive fn) is
  still tracked and triggers a full re-render on change, exactly like
  examples.todomvc's single top-level `ui` fn does upstream."
  (:require [clojure.string :as str]
            [odoyle.rules :as o]
            [io.github.humbleui.ui :as ui]
            [app.storage.sqlite :as storage]
            [app.desktop.controller :as controller]
            [app.desktop.api :as api]
            [app.desktop.sync :as sync]
            [app.desktop.tasks :as tasks]
            [app.desktop.nav :as nav]))

;; ui/text-input's :*value option only ever seeds the *initial* text — typing
;; mutates the widget's own internal :*state, never :*value (confirmed by
;; reading HumbleUI's text_field.clj: no watch/effect anywhere syncs :*state's
;; :text back into :*value). The supported two-way-bound pattern (used by every
;; upstream example, e.g. examples.todomvc's *new-todo) is to pass a signal
;; holding {:text ...} as :*state directly, so typing mutates *our* atom.
;; Hence every field signal below holds {:text "..."}, read via (:text @*sig).
(defonce *conn (atom nil))
;; Navigation lives in odoyle-rules (app.desktop.nav) rather than a plain
;; keyword signal — both the login/dashboard shell AND the sidebar's active
;; tab are facts+rules, per the plan (a deliberate choice to go further than
;; the web app itself, which only rules-drives its outer shell).
(defonce *nav (ui/signal (nav/new-session)))
(defonce *session (ui/signal {:jwt nil :org-id nil :email nil}))
(defonce *email (ui/signal {:text ""}))
(defonce *password (ui/signal {:text ""}))
(defonce *login-error (ui/signal nil))
(defonce *properties (ui/signal []))
(defonce *syncing? (ui/signal false))
(defonce *sync-message (ui/signal nil))

;; Property detail/edit screen (PropertyDetail.tsx ported: Stammdaten tab is
;; editable — the desktop controller already supports every field below —
;; Wohnungen/Garagen/Mieter tabs are read-only views of the synced reference
;; data, since there's no local create/update for those entities yet.
(defonce *detail-property-id (ui/signal nil))
(defonce *detail-tab (ui/signal :stammdaten))
(defonce *detail-error (ui/signal nil))
;; When true and *detail-property-id is nil, properties-screen shows the full
;; Stammdaten form (same field set/layout as PropertyDetail's edit form,
;; matching the web app's "Neue Immobilie hinzufügen" dialog) in create mode
;; instead of the properties list.
(defonce *creating-property? (ui/signal false))
(defonce *edit-name (ui/signal {:text ""}))
(defonce *edit-address (ui/signal {:text ""}))
(defonce *edit-city (ui/signal {:text ""}))
(defonce *edit-postal-code (ui/signal {:text ""}))
(defonce *edit-country (ui/signal {:text ""}))
(defonce *edit-units (ui/signal {:text ""}))
(defonce *edit-purchase-price (ui/signal {:text ""}))
(defonce *edit-current-value (ui/signal {:text ""}))
(defonce *edit-acquisition-date (ui/signal {:text ""}))
(defonce *edit-land-value (ui/signal {:text ""}))
(defonce *edit-building-value (ui/signal {:text ""}))
(defonce *edit-ownership-share (ui/signal {:text ""}))
(defonce *edit-living-area-m2 (ui/signal {:text ""}))
(defonce *edit-rental-area-m2 (ui/signal {:text ""}))
(defonce *edit-year-built (ui/signal {:text ""}))
(defonce *edit-usage (ui/signal {:text ""}))

;; Reference data for the "Offene Aufgaben" compliance engine (app.desktop.tasks)
;; — read-only from the desktop's perspective for now, populated by
;; app.desktop.sync/pull-reference-data! on "Sync now" (see the plan's Phase S5
;; for local create/update of these).
(defonce *apartments (ui/signal []))
(defonce *tenants (ui/signal []))
(defonce *costs (ui/signal []))
(defonce *apartment-costs (ui/signal []))
(defonce *rent-payments (ui/signal []))
(defonce *garages (ui/signal []))
(defonce *garage-payments (ui/signal []))
(defonce *tax-configs (ui/signal []))
(defonce *tasks-result (ui/signal {:tasks [] :total-checks 0 :passed-checks 0}))
;; Mirrors the web dashboard's default (PendingTasksWidget.tsx: year ?? new
;; Date().getFullYear() - 1) — Nebenkosten billing targets the prior year.
(defonce *dashboard-year (ui/signal (dec (.getYear (java.time.LocalDate/now)))))

(defn init!
  "Called once from -main after opening the local db. Restores a previous
  session (if any) straight to the Dashboard — login is only needed once per
  machine, same as any other desktop app."
  [conn]
  (reset! *conn conn)
  (let [{:keys [jwt org_id user_email]} (storage/sync-state conn)]
    (when jwt
      (reset! *session {:jwt jwt :org-id org_id :email user_email})
      (swap! *nav nav/set-authenticated true))))

(defn- load-all
  "All locally-stored entities of a given :db/type — the local db only ever
  holds one org's data (the logged-in org), so no org-id filter is needed."
  [db-type]
  (storage/pull-many @*conn (storage/find-by-type @*conn db-type) '*))

(defn- load-dashboard-data!
  "Refreshes every local collection the Dashboard/Properties/Tasks screens
  read, and recomputes the tasks-compliance result against them."
  []
  (let [{:keys [org-id]} @*session]
    (reset! *properties (:properties (controller/get-properties @*conn org-id))))
  (reset! *apartments (load-all "apartment"))
  (reset! *tenants (load-all "tenant"))
  (reset! *costs (load-all "cost"))
  (reset! *apartment-costs (load-all "apartment-cost"))
  (reset! *rent-payments (load-all "rent-payment"))
  (reset! *garages (load-all "garage"))
  (reset! *garage-payments (load-all "garage-payment"))
  (reset! *tax-configs (load-all "property-tax-config"))
  (reset! *tasks-result
          (tasks/compute-tasks {:properties       @*properties
                                 :apartments       @*apartments
                                 :tenants          @*tenants
                                 :costs            @*costs
                                 :apartment-costs  @*apartment-costs
                                 :rent-payments    @*rent-payments
                                 :garages          @*garages
                                 :garage-payments  @*garage-payments
                                 :tax-configs      @*tax-configs}
                                @*dashboard-year)))

(defn- current-detail-property []
  (some #(when (= (:db/id %) @*detail-property-id) %) @*properties))

(defn- ->field-text [v]
  {:text (if (some? v) (str v) "")})

(defn- open-property-detail! [property]
  (reset! *creating-property? false)
  (reset! *detail-property-id (:db/id property))
  (reset! *detail-tab :stammdaten)
  (reset! *detail-error nil)
  (reset! *edit-name (->field-text (:property/name property)))
  (reset! *edit-address (->field-text (:property/address property)))
  (reset! *edit-city (->field-text (:property/city property)))
  (reset! *edit-postal-code (->field-text (:property/postal-code property)))
  (reset! *edit-country (->field-text (:property/country property)))
  (reset! *edit-units (->field-text (:property/units property)))
  (reset! *edit-purchase-price (->field-text (:property/purchase-price property)))
  (reset! *edit-current-value (->field-text (:property/current-value property)))
  (reset! *edit-acquisition-date (->field-text (:property/acquisition-date property)))
  (reset! *edit-land-value (->field-text (:property/land-value property)))
  (reset! *edit-building-value (->field-text (:property/building-value property)))
  (reset! *edit-ownership-share (->field-text (:property/ownership-share property)))
  (reset! *edit-living-area-m2 (->field-text (:property/living-area-m2 property)))
  (reset! *edit-rental-area-m2 (->field-text (:property/rental-area-m2 property)))
  (reset! *edit-year-built (->field-text (:property/year-built property)))
  (reset! *edit-usage (->field-text (:property/usage property))))

(defn- open-create-property!
  "Same field set/layout as open-property-detail!, just starting empty and in
  create mode (*detail-property-id nil, *creating-property? true)."
  []
  (reset! *detail-property-id nil)
  (reset! *creating-property? true)
  (reset! *detail-error nil)
  (doseq [sig [*edit-name *edit-address *edit-city *edit-postal-code *edit-country
               *edit-units *edit-purchase-price *edit-current-value *edit-acquisition-date
               *edit-land-value *edit-building-value *edit-ownership-share
               *edit-living-area-m2 *edit-rental-area-m2 *edit-year-built *edit-usage]]
    (reset! sig {:text ""})))

(defn- close-property-form! []
  (reset! *creating-property? false))

;; field-text/field-num read back what boxed-field's :*state signals hold —
;; nil (not "") when blank, matching controller/update-property!'s (some? v)
;; convention: nil means "leave unchanged", not "clear".
(defn- field-text [sig]
  (let [s (str/trim (:text @sig))]
    (when-not (str/blank? s) s)))

(defn- field-num [sig]
  (when-let [s (field-text sig)]
    (try (Double/parseDouble (str/replace s "," "."))
         (catch Exception _ nil))))

(defn- do-save-property! [_]
  (reset! *detail-error nil)
  (let [{:keys [org-id]} @*session
        creating? (nil? @*detail-property-id)
        data {:id               @*detail-property-id
              :name             (field-text *edit-name)
              :address          (field-text *edit-address)
              :city             (field-text *edit-city)
              :postal-code      (field-text *edit-postal-code)
              :country          (field-text *edit-country)
              :units            (some-> (field-num *edit-units) long)
              :purchase-price   (field-num *edit-purchase-price)
              :current-value    (field-num *edit-current-value)
              :acquisition-date (field-text *edit-acquisition-date)
              :land-value       (field-num *edit-land-value)
              :building-value   (field-num *edit-building-value)
              :ownership-share  (field-num *edit-ownership-share)
              :living-area-m2   (field-num *edit-living-area-m2)
              :rental-area-m2   (field-num *edit-rental-area-m2)
              :year-built       (some-> (field-num *edit-year-built) long)
              :usage            (field-text *edit-usage)}
        result (if creating?
                 (controller/create-property! @*conn org-id data)
                 (controller/update-property! @*conn org-id data))]
    (if (:error result)
      (reset! *detail-error (:error result))
      (do (load-dashboard-data!)
          (when creating? (close-property-form!))))))

(defn- error->message
  "Server/network errors show up in several shapes ({:error :kw}, {:error
  {:error \"string\"}} for 404s, plain strings for uncaught exceptions) — this
  never throws regardless of shape, unlike calling `name` directly on
  whatever came back."
  [err]
  (cond
    (nil? err)     nil
    (keyword? err) (name err)
    (string? err)  err
    (map? err)     (str (or (:error err) (:message err) err))
    :else          (str err)))

(defn- do-login!
  "Local-first: the local SQLite db is the source of truth once a device has
  authenticated as a given email — a first-time sign-in on this device needs
  the server (there's no other way to establish identity/org-id), but if the
  server is unreachable and this device has already signed in as this email
  before, log in from the cached session instead of blocking the user."
  [_]
  (reset! *login-error nil)
  (let [email    (:text @*email)
        password (:text @*password)
        cached   (storage/sync-state @*conn)]
    (future
      (let [result (api/sign-in email password)]
        (cond
          (not (:error result))
          (let [{:keys [token user]} result
                {:keys [org-id]} user]
            (storage/update-sync-state! @*conn {:jwt token :org_id org-id :user_email email})
            (reset! *session {:jwt token :org-id org-id :email email})
            (swap! *nav nav/set-authenticated true)
            (load-dashboard-data!))

          (and (= :offline (:error result)) (:jwt cached) (= (:user_email cached) email))
          (do (reset! *session {:jwt (:jwt cached) :org-id (:org_id cached) :email email})
              (swap! *nav nav/set-authenticated true)
              (load-dashboard-data!))

          :else
          (reset! *login-error (:error result)))))))

(defn- do-logout! [_]
  (storage/update-sync-state! @*conn {:jwt nil})
  (reset! *session {:jwt nil :org-id nil :email nil})
  (swap! *nav nav/set-authenticated false))

(defn- do-delete-property! [id]
  (let [{:keys [org-id]} @*session]
    (controller/delete-property! @*conn org-id {:id id})
    (load-dashboard-data!)))

(defn- do-sync! [_]
  (reset! *syncing? true)
  (reset! *sync-message nil)
  (future
    (let [{:keys [jwt]} @*session
          result (sync/sync! @*conn jwt)]
      (reset! *syncing? false)
      (if (:error result)
        (reset! *sync-message (str "Sync failed (" (error->message (:error result)) ") — working offline"))
        (do (load-dashboard-data!)
            (reset! *sync-message (str "Synced — pushed " (:pushed result 0) ", pulled " (:pulled result 0)
                                        ", reference " (:reference-pulled result 0))))))))

(ui/defcomp boxed-field
  "A raw ui/text-input has no chrome of its own (no border, no background) —
  invisible against the window's off-white background unless wrapped in
  something that draws a box, same as examples.todomvc's `todo-edit`.
  It also isn't clickable/typable on its own: keyboard events only reach a
  component whose ancestor chain sets :hui/focused? in ctx, which is exactly
  what ui/focusable does on click (ui/window already wraps the whole app in a
  focus-controller, so this is the only piece each field needs to opt in)."
  [label-text width *state]
  [ui/column {:gap 4}
   [ui/label label-text]
   [ui/size {:width width}
    [ui/rect {:radius 4 :paint {:stroke 0xFF999999}}
     [ui/padding {:padding 6}
      [ui/focusable
       [ui/with-cursor {:cursor :ibeam}
        [ui/text-input {:*state *state}]]]]]]])

(ui/defcomp masked-field
  "Same as boxed-field, but for passwords. This pinned HumbleUI build has no
  built-in masking option on text-field/text-input, so this fakes it: the real
  input keeps editing normally underneath (full cursor/selection/copy-paste
  behavior intact — nothing about typing is touched), but its glyphs are
  painted fully transparent (:hui.text-field/paint alpha 0) and a purely
  decorative, non-interactive row of • characters is stacked on top, one per
  character currently typed."
  [label-text width *state]
  [ui/column {:gap 4}
   [ui/label label-text]
   [ui/size {:width width}
    [ui/rect {:radius 4 :paint {:stroke 0xFF999999}}
     [ui/padding {:padding 6}
      [ui/stack
       [ui/focusable
        [ui/with-cursor {:cursor :ibeam}
         [ui/with-context {:hui.text-field/paint {:fill 0x00000000}}
          [ui/text-input {:*state *state}]]]]
       [ui/label (apply str (repeat (count (:text @*state)) "•"))]]]]]])

(ui/defcomp login-screen []
  [ui/center
   [ui/column {:gap 10}
    [ui/label "Property Management — Sign in"]
    [boxed-field "Email" 260 *email]
    [masked-field "Password" 260 *password]
    (when-let [err @*login-error]
      [ui/label (if (= :offline err)
                  "Can't reach the server for first-time sign-in — check your internet connection and try again."
                  (str "Error: " (error->message err)))])
    [ui/button {:on-click do-login!} [ui/label "Sign in"]]]])

(declare stammdaten-tab property-detail-screen)

(defonce *property-filter (ui/signal {:text ""}))

(defn- property-matches-filter? [filter-text {:keys [property/name property/address property/city]}]
  (or (str/blank? filter-text)
      (some #(str/includes? (str/lower-case (str %)) filter-text) [name address city])))

(ui/defcomp property-card
  "PropertyList.tsx card, ported: name + edit/delete, address, city/postal,
  Einheiten, Belegung with a progress bar, Baujahr. The progress-bar fill uses
  ui/size with a *function* width (a fraction of the available container
  width, not a literal pixel count) — confirmed real HumbleUI usage in
  io.github.humbleui.docs.shared/table's own layout, not a guess."
  [{:keys [db/id property/name property/address property/city property/postal-code
           property/units property/year-built] :as property}]
  (let [apts     (filter #(= (:apartment/property-id %) id) @*apartments)
        occupied (count (filter :apartment/occupied apts))
        total    (count apts)
        pct      (if (pos? total) (/ (double occupied) total) 0.0)]
    [ui/size {:width 320}
     [ui/rect {:radius 8 :paint {:stroke 0xFFE5E5E5}}
      [ui/padding {:padding 16}
       [ui/column {:gap 6}
        [ui/row {:gap 8}
         [ui/label {:font-size 16} name]
         [ui/button {:on-click (fn [_] (open-property-detail! property))} [ui/label "Bearbeiten"]]
         [ui/button {:on-click (fn [_] (do-delete-property! id))} [ui/label "Löschen"]]]
        (when-not (str/blank? (str address)) [ui/label {:font-size 12} address])
        (when (or (not (str/blank? (str city))) (not (str/blank? (str postal-code))))
          [ui/label {:font-size 12} (str city (when (and (seq (str city)) (seq (str postal-code))) ", ") postal-code)])
        (when (some? units) [ui/label (str "Einheiten: " (long units))])
        (when (pos? total)
          [ui/column {:gap 4}
           [ui/row {:gap 10}
            [ui/label {:font-size 12} (str "Belegung: " occupied "/" total)]
            [ui/label {:font-size 12} (str (int (Math/round (* 100 pct))) "%")]]
           [ui/stack
            [ui/rect {:radius 3 :paint {:fill "EEEEEE"}} [ui/gap {:height 6}]]
            [ui/size {:width #(* pct (:width %))}
             [ui/rect {:radius 3 :paint {:fill "22C55E"}} [ui/gap {:height 6}]]]]])
        (when (some? year-built) [ui/label {:font-size 12} (str "Baujahr " (long year-built))])]]]]))

(ui/defcomp properties-list []
  (let [filter-text (str/lower-case (str/trim (:text @*property-filter)))
        filtered    (filter #(property-matches-filter? filter-text %) @*properties)]
    [ui/padding {:padding 20}
     [ui/column {:gap 12}
      [ui/row {:gap 10}
       [ui/label {:font-size 22} (str "Immobilien (" (count @*properties) ")")]
       [ui/button {:on-click (fn [_] (open-create-property!))} [ui/label "+ Immobilie hinzufügen"]]]
      [boxed-field "Suchen" 400 *property-filter]
      [ui/vscroll
       [ui/column {:gap 12}
        (if (empty? filtered)
          [ui/label "Keine Treffer"]
          (for [p filtered] [property-card p]))]]]]))

(ui/defcomp properties-screen []
  (if @*detail-property-id
    [property-detail-screen]
    [properties-list]))

(ui/defcomp property-create-modal
  "A real floating modal via ui/overlay (io.github.humbleui.ui/overlay —
  confirmed real in the pinned HumbleUI source: the whole app is already
  wrapped in an overlay-root by ui/window, this just registers into it), not
  the earlier in-place view-swap. No dimmed backdrop behind it — layering a
  second full-window semi-transparent overlay wasn't something this session
  could confirm renders correctly, so it's skipped rather than risked.

  NOTE: unlike `(when cond [...])` used *inline inside a children list* (safe —
  used all over this file, e.g. shell-header's sync-message line), a defcomp
  whose own top-level render return is nil crashes the reconciler
  (\"Unexpected return type: {:f nil, :args nil, :res nil}\") — this component
  must never be called except already guarded by `(when @*creating-property?
  ...)` at the *call site* (see dashboard-shell), so its own body always
  returns real markup."
  []
  [ui/overlay
   [ui/shadow {:dy 4 :blur 24 :color 0x40000000}
    [ui/rect {:radius 8 :paint {:fill "FFFFFF"}}
     [ui/size {:width 480}
      [ui/padding {:padding 24}
       [ui/vscroll
        [ui/column {:gap 16}
         [ui/row {:gap 10}
          [ui/label {:font-size 20} "Neue Immobilie hinzufügen"]
          [ui/button {:on-click (fn [_] (close-property-form!))} [ui/label "✕"]]]
         [stammdaten-tab]]]]]]]])

;; ---------------------------------------------------------------------------
;; Dashboard — stat tiles (DashboardSummary.tsx) + Offene Aufgaben
;; (PendingTasksWidget.tsx, read-only for now — see the plan's Phase S5).
;; ---------------------------------------------------------------------------

(ui/defcomp stat-card [title value subtitle]
  [ui/size {:width 200}
   [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
    [ui/padding {:padding 12}
     [ui/column {:gap 4}
      [ui/label title]
      [ui/label {:font-size 22} (str value)]
      (when subtitle [ui/label {:font-size 11} subtitle])]]]])

(ui/defcomp property-occupancy-card [{:keys [db/id property/name property/address]}]
  (let [apts     (filter #(= (:apartment/property-id %) id) @*apartments)
        occupied (count (filter :apartment/occupied apts))
        total    (count apts)
        pct      (if (pos? total) (int (Math/round (* 100.0 (/ occupied total)))) 0)]
    [ui/size {:width 240}
     [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
      [ui/padding {:padding 10}
       [ui/column {:gap 2}
        [ui/label name]
        [ui/label {:font-size 11} address]
        (if (pos? total)
          [ui/label (str occupied "/" total " · " pct "%")]
          [ui/label {:font-size 11} "Keine Wohnungen erfasst"])]]]]))

(def ^:private category-labels {:steuer "Steuer" :nebenkosten "Abrechnung"})
(def ^:private category-colors {:steuer ["DBEAFE" "1D4ED8"] :nebenkosten ["FEF3C7" "92400E"]})

(defn- task-description
  "German task-title templates, ported verbatim from
  projects/frontend/ui/lib/i18n.ts's `tasks.types` (DE block)."
  [{:keys [type property-name apt-code tenant-name garage-code]}]
  (case type
    :missing-acquisition-date (str "Anschaffungsdatum hinzufügen — " property-name)
    :missing-land-value       (str "Grundstückswert hinzufügen — " property-name)
    :missing-building-value   (str "Gebäudewert hinzufügen — " property-name)
    :missing-ownership-share  (str "Eigentumsanteil hinzufügen — " property-name)
    :missing-year-built       (str "Baujahr hinzufügen — " property-name)
    :missing-usage            (str "Nutzungsart festlegen — " property-name)
    :missing-afa-config       (str "AfA-Abschreibung konfigurieren — " property-name)
    :missing-iban             (str "IBAN hinzufügen — " property-name)
    :missing-property-costs   (str "Kosten hinzufügen — " property-name)
    :missing-rent-payments    (str "Mietzahlungen hinzufügen für " apt-code)
    :missing-garage-payments  (str "Garagenmiete hinzufügen für " garage-code)
    :missing-apt-costs        (str "Kostenumlage hinzufügen für " apt-code)
    :missing-wohnflaeche      (str "Wohnfläche (m²) hinzufügen — " apt-code)
    :missing-market-rent      (str "Ortsübliche Miete hinterlegen — " apt-code)
    :missing-tenant           (str "Mieter hinzufügen oder Leerstand bestätigen — " apt-code)
    :missing-apt-allocation   (str "Kostenumlage eingeben (Verteiler) — " apt-code)
    :missing-tenant-startdate    (str "Startdatum fehlt — " tenant-name " (" apt-code ")")
    :missing-tenant-miete        (str "Mietangaben fehlen — " tenant-name " (" apt-code ")")
    :missing-tenant-personenzahl (str "Personenzahl fehlt — " tenant-name " (" apt-code ")")
    (str (name type) " — " property-name)))

(ui/defcomp task-row [{:keys [category] :as task}]
  (let [[bg fg] (category-colors category)]
    [ui/row {:gap 8}
     [ui/rect {:radius 10 :paint {:fill bg}}
      [ui/padding {:horizontal 8 :vertical 3}
       [ui/label {:font-size 10 :paint {:fill fg}} (category-labels category)]]]
     [ui/label (task-description task)]]))

(ui/defcomp task-panel []
  (let [{:keys [tasks total-checks passed-checks]} @*tasks-result
        pct (if (pos? total-checks) (int (Math/round (* 100.0 (/ passed-checks total-checks)))) 100)]
    [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
     [ui/padding {:padding 16}
      [ui/column {:gap 8}
       [ui/row {:gap 10}
        [ui/label {:font-size 16} (str "Offene Aufgaben " @*dashboard-year)]
        [ui/label (str pct "%")]]
       (if (empty? tasks)
         [ui/column {:gap 4}
          [ui/label "Alles erledigt!"]
          [ui/label {:font-size 11} (str "Alle Anforderungen für " @*dashboard-year " sind erfüllt.")]]
         [ui/column {:gap 4}
          [ui/label {:font-size 11} (str passed-checks " von " total-checks " Anforderungen erfüllt")]
          [ui/size {:height 260}
           [ui/vscroll
            [ui/column {:gap 6}
             (for [t tasks] [task-row t])]]]])]]]))

(ui/defcomp dashboard-screen []
  (let [tenant-count   (count @*tenants)
        total-units    (count @*apartments)
        occupied-units (count (filter :apartment/occupied @*apartments))
        occupancy-pct  (if (pos? total-units) (int (Math/round (* 100.0 (/ occupied-units total-units)))) 0)]
    [ui/padding {:padding 20}
     [ui/vscroll
      [ui/column {:gap 16}
       [ui/label {:font-size 22} "Dashboard"]
       [ui/row {:gap 12}
        [stat-card "Immobilien" (count @*properties) "Verwaltete Immobilien gesamt"]
        [stat-card "Mieter" tenant-count "Aktive Mietverträge"]
        [stat-card "Belegung" (str occupancy-pct "%") (str occupied-units " von " total-units " Einheiten belegt")]
        [stat-card "Zahlungen" "—" "noch nicht erfasst"]]
       (when (seq @*properties)
         [ui/column {:gap 8}
          [ui/label {:font-size 16} "Belegung nach Immobilien"]
          [ui/row {:gap 12}
           (for [p @*properties] [property-occupancy-card p])]])
       [task-panel]]]]))

;; ---------------------------------------------------------------------------
;; Property detail/edit — PropertyDetail.tsx ported. Stammdaten is a real
;; editable form (controller/update-property! already covers every field
;; here); Wohnungen/Garagen/Mieter are read-only views of the synced
;; reference data — see the plan's Phase S5 for local create/update of those.
;; ---------------------------------------------------------------------------

(ui/defcomp stammdaten-tab []
  [ui/column {:gap 16}
   [ui/row {:gap 12}
    [boxed-field "Name" 220 *edit-name]
    [boxed-field "Adresse" 220 *edit-address]
    [boxed-field "Stadt" 160 *edit-city]
    [boxed-field "Postleitzahl" 120 *edit-postal-code]]
   [ui/row {:gap 12}
    [boxed-field "Land" 160 *edit-country]
    [boxed-field "Einheiten" 100 *edit-units]]

   [ui/label {:font-size 11} "ERWERB & FINANZEN"]
   [ui/row {:gap 12}
    [boxed-field "Anschaffungsdatum (JJJJ-MM-TT)" 190 *edit-acquisition-date]
    [boxed-field "Kaufpreis (€)" 140 *edit-purchase-price]
    [boxed-field "Grundstückswert (€)" 160 *edit-land-value]
    [boxed-field "Gebäudewert (€)" 160 *edit-building-value]
    [boxed-field "Aktueller Wert (€)" 160 *edit-current-value]]

   [ui/label {:font-size 11} "OBJEKTDETAILS"]
   [ui/row {:gap 12}
    [boxed-field "Baujahr" 100 *edit-year-built]
    [boxed-field "Eigentumsanteil (%)" 140 *edit-ownership-share]
    [boxed-field "Wohnfläche (m²)" 140 *edit-living-area-m2]
    [boxed-field "Vermietbare Fläche (m²)" 160 *edit-rental-area-m2]
    [boxed-field "Nutzungsart" 220 *edit-usage]]

   [ui/row {:gap 10}
    [ui/button {:on-click do-save-property!} [ui/label "Speichern"]]
    (when-let [err @*detail-error] [ui/label (str "Error: " (error->message err))])]])

;; ---------------------------------------------------------------------------
;; Apartment CRUD (plan Phase N3) — mirrors app.desktop.controller's
;; create-apartment!/delete-apartment!, scoped to the currently-open property.
;; ---------------------------------------------------------------------------

(defonce *new-apt-code (ui/signal {:text ""}))
(defonce *new-apt-wohnflaeche (ui/signal {:text ""}))
(defonce *apt-form-error (ui/signal nil))
(defonce *adding-tenant-for-apt-id (ui/signal nil))
(defonce *new-tenant-first-name (ui/signal {:text ""}))
(defonce *new-tenant-last-name (ui/signal {:text ""}))
(defonce *new-tenant-start-date (ui/signal {:text ""}))
(defonce *tenant-form-error (ui/signal nil))

(defn- do-create-apartment! [_]
  (reset! *apt-form-error nil)
  (let [{:keys [org-id]} @*session
        result (controller/create-apartment!
                @*conn org-id
                {:property-id @*detail-property-id
                 :code        (field-text *new-apt-code)
                 :wohnflaeche (field-num *new-apt-wohnflaeche)})]
    (if (:error result)
      (reset! *apt-form-error (:error result))
      (do (reset! *new-apt-code {:text ""})
          (reset! *new-apt-wohnflaeche {:text ""})
          (load-dashboard-data!)))))

(defn- do-delete-apartment! [id]
  (let [{:keys [org-id]} @*session]
    (controller/delete-apartment! @*conn org-id {:id id})
    (load-dashboard-data!)))

(defn- open-add-tenant! [apt-id]
  (reset! *adding-tenant-for-apt-id apt-id)
  (reset! *tenant-form-error nil)
  (reset! *new-tenant-first-name {:text ""})
  (reset! *new-tenant-last-name {:text ""})
  (reset! *new-tenant-start-date {:text ""}))

(defn- do-create-tenant! [_]
  (reset! *tenant-form-error nil)
  (let [{:keys [org-id]} @*session
        result (controller/create-tenant!
                @*conn org-id
                {:apartment-id @*adding-tenant-for-apt-id
                 :first-name   (field-text *new-tenant-first-name)
                 :last-name    (field-text *new-tenant-last-name)
                 :start-date   (field-text *new-tenant-start-date)})]
    (if (:error result)
      (reset! *tenant-form-error (:error result))
      (do (reset! *adding-tenant-for-apt-id nil)
          (load-dashboard-data!)))))

(defn- do-delete-tenant! [id]
  (let [{:keys [org-id]} @*session]
    (controller/delete-tenant! @*conn org-id {:id id})
    (load-dashboard-data!)))

(ui/defcomp add-tenant-form [apt-id]
  [ui/column {:gap 4}
   [boxed-field "Vorname" 180 *new-tenant-first-name]
   [boxed-field "Nachname" 180 *new-tenant-last-name]
   [boxed-field "Einzugsdatum (JJJJ-MM-TT)" 180 *new-tenant-start-date]
   [ui/row {:gap 8}
    [ui/button {:on-click do-create-tenant!} [ui/label "Speichern"]]
    [ui/button {:on-click (fn [_] (reset! *adding-tenant-for-apt-id nil))} [ui/label "Abbrechen"]]]
   (when-let [err @*tenant-form-error] [ui/label {:font-size 11} (str "Error: " (error->message err))])])

(ui/defcomp apartment-card [{:keys [db/id apartment/code apartment/occupied apartment/wohnflaeche]}]
  (let [tenant (some #(when (and (= (:tenant/apartment-id %) id)
                                 (str/blank? (str (:tenant/end-date %))))
                        %)
                     @*tenants)]
    [ui/size {:width 240}
     [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
      [ui/padding {:padding 10}
       [ui/column {:gap 2}
        [ui/row {:gap 8}
         [ui/label (or code (str id))]
         [ui/label {:font-size 10} (if occupied "Belegt" "Frei")]]
        (when wohnflaeche [ui/label {:font-size 11} (str wohnflaeche " m²")])
        [ui/label {:font-size 11}
         (if tenant (str (:tenant/first-name tenant) " " (:tenant/last-name tenant)) "Leer")]
        [ui/row {:gap 8}
         (when-not tenant
           [ui/button {:on-click (fn [_] (open-add-tenant! id))} [ui/label "+ Mieter"]])
         [ui/button {:on-click (fn [_] (do-delete-apartment! id))} [ui/label "Löschen"]]]
        (when (= @*adding-tenant-for-apt-id id) [add-tenant-form id])]]]]))

(ui/defcomp apartments-tab []
  (let [prop-id @*detail-property-id
        apts    (filter #(= (:apartment/property-id %) prop-id) @*apartments)]
    [ui/column {:gap 16}
     (if (empty? apts)
       [ui/label "Keine Wohnungen für dieses Objekt"]
       [ui/row {:gap 12} (for [a apts] [apartment-card a])])
     [ui/row {:gap 8}
      [boxed-field "Code" 140 *new-apt-code]
      [boxed-field "Wohnfläche (m²)" 140 *new-apt-wohnflaeche]
      [ui/button {:on-click do-create-apartment!} [ui/label "Wohnung hinzufügen"]]]
     (when-let [err @*apt-form-error] [ui/label (str "Error: " (error->message err))])]))

(ui/defcomp garage-card [{:keys [garage/code garage/occupied garage/flaeche garage/monthly-rent]}]
  [ui/size {:width 200}
   [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
    [ui/padding {:padding 10}
     [ui/column {:gap 2}
      [ui/row {:gap 8}
       [ui/label (or code "—")]
       [ui/label {:font-size 10} (if occupied "Belegt" "Frei")]]
      (when flaeche [ui/label {:font-size 11} (str flaeche " m²")])
      (when monthly-rent [ui/label {:font-size 11} (str "€ " monthly-rent " / Mon.")])]]]])

(ui/defcomp garages-tab []
  (let [prop-id @*detail-property-id
        gs      (filter #(= (:garage/property-id %) prop-id) @*garages)]
    (if (empty? gs)
      [ui/label "Keine Garagen für dieses Objekt"]
      [ui/row {:gap 12} (for [g gs] [garage-card g])])))

(ui/defcomp tenant-card [{:keys [db/id tenant/first-name tenant/last-name tenant/email tenant/start-date]}]
  [ui/size {:width 220}
   [ui/rect {:radius 6 :paint {:stroke 0xFFDDDDDD}}
    [ui/padding {:padding 10}
     [ui/column {:gap 2}
      [ui/label (str first-name " " last-name)]
      (when-not (str/blank? (str email)) [ui/label {:font-size 11} email])
      (when-not (str/blank? (str start-date)) [ui/label {:font-size 11} (str "ab " start-date)])
      [ui/button {:on-click (fn [_] (do-delete-tenant! id))} [ui/label "Löschen"]]]]]])

(ui/defcomp tenants-tab []
  (let [prop-id (str @*detail-property-id)
        apt-ids (set (map :db/id (filter #(= (str (:apartment/property-id %)) prop-id) @*apartments)))
        ts      (filter #(contains? apt-ids (:tenant/apartment-id %)) @*tenants)]
    (if (empty? ts)
      [ui/label "Keine Mieter für dieses Objekt"]
      [ui/row {:gap 12} (for [t ts] [tenant-card t])])))

(ui/defcomp property-detail-screen []
  (let [property (current-detail-property)]
    [ui/padding {:padding 20}
     [ui/vscroll
      [ui/column {:gap 16}
       [ui/row {:gap 10}
        [ui/button {:on-click (fn [_] (reset! *detail-property-id nil))} [ui/label "← Zurück"]]
        [ui/label {:font-size 20} (or (:property/name property) "")]]
       [ui/row {:gap 8}
        [ui/button {:on-click (fn [_] (reset! *detail-tab :stammdaten))} [ui/label "Stammdaten"]]
        [ui/button {:on-click (fn [_] (reset! *detail-tab :apartments))} [ui/label "Wohnungen"]]
        [ui/button {:on-click (fn [_] (reset! *detail-tab :garages))} [ui/label "Garagen"]]
        [ui/button {:on-click (fn [_] (reset! *detail-tab :tenants))} [ui/label "Mieter"]]]
       (case @*detail-tab
         :stammdaten [stammdaten-tab]
         :apartments [apartments-tab]
         :garages    [garages-tab]
         :tenants    [tenants-tab]
         [stammdaten-tab])]]]))

;; ---------------------------------------------------------------------------
;; Top-level Wohnungen/Mieter sidebar tabs — flat read+delete lists across
;; every property. Creation stays property-scoped, from inside a property's
;; own Wohnungen/Mieter tab above (property-id/apartment-id already known
;; there, avoiding the need for a picker widget this HumbleUI build doesn't
;; have).
;; ---------------------------------------------------------------------------

(defn- property-name-for [property-id]
  (or (some #(when (= (:db/id %) property-id) (:property/name %)) @*properties)
      (str property-id)))

(ui/defcomp apartments-row [{:keys [db/id apartment/code apartment/property-id apartment/occupied apartment/wohnflaeche]}]
  [ui/row {:gap 10}
   [ui/label (property-name-for property-id)]
   [ui/label (or code (str id))]
   [ui/label {:font-size 11} (if occupied "Belegt" "Frei")]
   (when wohnflaeche [ui/label {:font-size 11} (str wohnflaeche " m²")])
   [ui/button {:on-click (fn [_] (do-delete-apartment! id))} [ui/label "Löschen"]]])

(ui/defcomp apartments-screen []
  [ui/padding {:padding 20}
   [ui/vscroll
    [ui/column {:gap 8}
     [ui/label {:font-size 20} "Wohnungen"]
     (if (empty? @*apartments)
       [ui/label "Noch keine Wohnungen erfasst"]
       [ui/column {:gap 6} (for [a @*apartments] [apartments-row a])])]]])

(ui/defcomp tenants-row [{:keys [db/id tenant/first-name tenant/last-name tenant/apartment-id]}]
  (let [apt (some #(when (= (:db/id %) apartment-id) %) @*apartments)]
    [ui/row {:gap 10}
     [ui/label (str first-name " " last-name)]
     [ui/label {:font-size 11}
      (if apt (str (property-name-for (:apartment/property-id apt)) " · " (:apartment/code apt)) "—")]
     [ui/button {:on-click (fn [_] (do-delete-tenant! id))} [ui/label "Löschen"]]]))

(ui/defcomp tenants-screen []
  [ui/padding {:padding 20}
   [ui/vscroll
    [ui/column {:gap 8}
     [ui/label {:font-size 20} "Mieter"]
     (if (empty? @*tenants)
       [ui/label "Noch keine Mieter erfasst"]
       [ui/column {:gap 6} (for [t @*tenants] [tenants-row t])])]]])

(ui/defcomp coming-soon-screen [label]
  [ui/padding {:padding 20}
   [ui/column {:gap 8}
    [ui/label {:font-size 20} label]
    [ui/label "Noch nicht verfügbar"]]])

;; ---------------------------------------------------------------------------
;; Sidebar + shell — dashboard.tsx's SidebarContent ported: a permanent
;; sidebar rather than the web app's mobile-only Sheet/drawer (a native window
;; has ample width, no responsive breakpoint to replicate), text-only rows
;; (no icon assets available for this build). Active-tab highlighting and
;; navigation both read/write app.desktop.nav's odoyle session.
;; ---------------------------------------------------------------------------

(ui/defcomp nav-row [{:keys [id label]}]
  (let [active? (= id (nav/current-tab @*nav))]
    [ui/clickable {:on-click (fn [_] (swap! *nav nav/set-active-tab id))}
     [ui/rect {:radius 4 :paint {:fill (if active? "E1EFFA" "FAFAFA")}}
      [ui/padding {:horizontal 10 :vertical 8}
       [ui/label label]]]]))

(ui/defcomp sidebar []
  [ui/size {:width 200}
   [ui/rect {:paint {:fill "FAFAFA"}}
    [ui/padding {:padding 10}
     [ui/column {:gap 12}
      [ui/label {:font-size 16} "PropManager"]
      [ui/column {:gap 2} (for [tab nav/all-tabs] [nav-row tab])]
      [ui/gap {:height 10}]
      [ui/button {:on-click do-logout!} [ui/label "Abmelden"]]]]]])

(ui/defcomp shell-header []
  [ui/row {:gap 10}
   [ui/label (str "Signed in as " (:email @*session))]
   [ui/button {:on-click do-sync!} [ui/label (if @*syncing? "Syncing…" "Sync now")]]
   (when-let [msg @*sync-message] [ui/label msg])])

(ui/defcomp dashboard-shell []
  [ui/stack
   [ui/row
    [sidebar]
    [ui/column {:gap 0}
     [ui/padding {:padding 10} [shell-header]]
     (case (nav/current-tab @*nav)
       :overview   [dashboard-screen]
       :properties [properties-screen]
       :apartments [apartments-screen]
       :tenants    [tenants-screen]
       [coming-soon-screen
        (:label (some #(when (= (:id %) (nav/current-tab @*nav)) %) nav/all-tabs) "")])]]
   ;; ui/stack layers this over the *whole* shell (sidebar included), so
   ;; ui/align centers the modal in the full window, not just the content
   ;; column — and the (when ...) guard lives here, not inside
   ;; property-create-modal itself (see its docstring for why that matters).
   (when @*creating-property?
     [ui/align {:x :center :y :center}
      [property-create-modal]])])

(ui/defcomp root []
  (fn []
    (case (nav/current-section @*nav)
      :login     [login-screen]
      :dashboard [dashboard-shell]
      [login-screen])))
