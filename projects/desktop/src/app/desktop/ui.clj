(ns app.desktop.ui
  "Login + Properties screens. `root` is the single reactive component passed
  to ui/window — it's the one reactive boundary for the whole app, so every
  signal dereffed anywhere in its call tree (login-screen, properties-screen,
  property-row — none of which wrap themselves in their own reactive fn) is
  still tracked and triggers a full re-render on change, exactly like
  examples.todomvc's single top-level `ui` fn does upstream."
  (:require [io.github.humbleui.ui :as ui]
            [app.storage.sqlite :as storage]
            [app.desktop.controller :as controller]
            [app.desktop.api :as api]
            [app.desktop.sync :as sync]
            [app.desktop.tasks :as tasks]))

;; ui/text-input's :*value option only ever seeds the *initial* text — typing
;; mutates the widget's own internal :*state, never :*value (confirmed by
;; reading HumbleUI's text_field.clj: no watch/effect anywhere syncs :*state's
;; :text back into :*value). The supported two-way-bound pattern (used by every
;; upstream example, e.g. examples.todomvc's *new-todo) is to pass a signal
;; holding {:text ...} as :*state directly, so typing mutates *our* atom.
;; Hence every field signal below holds {:text "..."}, read via (:text @*sig).
(defonce *conn (atom nil))
(defonce *screen (ui/signal :login))
(defonce *session (ui/signal {:jwt nil :org-id nil :email nil}))
(defonce *email (ui/signal {:text ""}))
(defonce *password (ui/signal {:text ""}))
(defonce *login-error (ui/signal nil))
(defonce *properties (ui/signal []))
(defonce *new-name (ui/signal {:text ""}))
(defonce *new-address (ui/signal {:text ""}))
(defonce *form-error (ui/signal nil))
(defonce *syncing? (ui/signal false))
(defonce *sync-message (ui/signal nil))

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
      (reset! *screen :dashboard))))

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
            (reset! *screen :dashboard)
            (load-dashboard-data!))

          (and (= :offline (:error result)) (:jwt cached) (= (:user_email cached) email))
          (do (reset! *session {:jwt (:jwt cached) :org-id (:org_id cached) :email email})
              (reset! *screen :dashboard)
              (load-dashboard-data!))

          :else
          (reset! *login-error (:error result)))))))

(defn- do-create-property! [_]
  (reset! *form-error nil)
  (let [{:keys [org-id]} @*session
        result (controller/create-property! @*conn org-id {:name    (:text @*new-name)
                                                             :address (:text @*new-address)})]
    (if (:error result)
      (reset! *form-error (:error result))
      (do (reset! *new-name {:text ""})
          (reset! *new-address {:text ""})
          (load-dashboard-data!)))))

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

(ui/defcomp property-row [{:keys [db/id property/name property/address]}]
  [ui/row {:gap 10}
   [ui/label (str name " — " address)]
   [ui/button {:on-click (fn [_] (do-delete-property! id))} [ui/label "Delete"]]])

(ui/defcomp properties-screen []
  [ui/padding {:padding 20}
   [ui/column {:gap 10}
    [ui/row {:gap 10}
     [ui/button {:on-click (fn [_] (reset! *screen :dashboard))} [ui/label "← Dashboard"]]
     [ui/label (str "Signed in as " (:email @*session))]
     [ui/button {:on-click do-sync!} [ui/label (if @*syncing? "Syncing…" "Sync now")]]]
    (when-let [msg @*sync-message] [ui/label msg])
    [ui/label "Properties"]
    [ui/vscroll
     [ui/column {:gap 4}
      (for [p @*properties] [property-row p])]]
    [ui/row {:gap 10}
     [boxed-field "Name" 200 *new-name]
     [boxed-field "Address" 200 *new-address]
     [ui/button {:on-click do-create-property!} [ui/label "Add property"]]]
    (when-let [err @*form-error] [ui/label (str "Error: " (error->message err))])]])

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
       [ui/row {:gap 10}
        [ui/label (str "Signed in as " (:email @*session))]
        [ui/button {:on-click do-sync!} [ui/label (if @*syncing? "Syncing…" "Sync now")]]
        [ui/button {:on-click (fn [_] (reset! *screen :properties))} [ui/label "Immobilien verwalten"]]]
       (when-let [msg @*sync-message] [ui/label msg])
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

(ui/defcomp root []
  (fn []
    (case @*screen
      :login      [login-screen]
      :dashboard  [dashboard-screen]
      :properties [properties-screen]
      [login-screen])))
