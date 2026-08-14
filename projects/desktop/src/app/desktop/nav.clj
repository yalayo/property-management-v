(ns app.desktop.nav
  "Navigation state as odoyle-rules facts, mirroring the pattern
  components/core-ui/src/app/core_ui/rules.cljs uses for the web app's outer
  shell (landing/auth/register/dashboard) — a session held in a mutable
  reference, facts inserted describing raw state, rules deriving a current
  section, read back via a no-op query rule. The web app itself only rules-drives
  the outer shell; its sidebar's active tab is a plain re-frame db key
  (main_ui/events.cljs, subs.cljs). Here both the shell (:login/:dashboard) AND
  the sidebar's active tab go through the rules engine — a deliberate choice to
  go further than the source app, not an oversight."
  (:require [odoyle.rules :as o]))

(def all-tabs
  "The 14 sidebar destinations, in order, matching the web app's ALL_NAV_ITEMS
  (projects/frontend/ui/pages/dashboard.tsx:68-83). :implemented? false renders
  a \"noch nicht verfügbar\" placeholder instead of real content."
  [{:id :overview   :label "Übersicht"            :implemented? true}
   {:id :properties :label "Immobilien"           :implemented? true}
   {:id :apartments :label "Wohnungen"            :implemented? true}
   {:id :tenants    :label "Mieter"                :implemented? true}
   {:id :bank       :label "Kontoauszug"           :implemented? false}
   {:id :abrechnung :label "Abrechnung"            :implemented? false}
   {:id :expenses   :label "Kostenarten"           :implemented? false}
   {:id :documents  :label "Dokumente"             :implemented? false}
   {:id :analytics  :label "Analysen"              :implemented? false}
   {:id :tax        :label "Steuer (Anlage V)"     :implemented? false}
   {:id :finances   :label "Einnahmen & Ausgaben"  :implemented? false}
   {:id :accounting :label "Buchhaltung"           :implemented? false}
   {:id :team       :label "Team"                  :implemented? false}
   {:id :admin      :label "Admin"                 :implemented? false}])

(def ^:private rules
  (o/ruleset
   {::shell-login
    [:what [::session ::authenticated? false]
     :then (o/insert! ::nav ::section :login)]

    ::shell-dashboard
    [:what [::session ::authenticated? true]
     :then (o/insert! ::nav ::section :dashboard)]

    ::get-section   [:what [::nav ::section section] :then false]
    ::get-active-tab [:what [::nav ::active-tab tab] :then false]}))

(defn new-session
  "A fresh session, logged out, defaulted to the Übersicht tab."
  []
  (-> (reduce o/add-rule (o/->session) rules)
      (o/insert ::session ::authenticated? false)
      (o/insert ::nav ::active-tab :overview)
      o/fire-rules))

(defn current-section [session]
  (:section (first (o/query-all session ::get-section))))

(defn current-tab [session]
  (:tab (first (o/query-all session ::get-active-tab))))

(defn set-authenticated
  "Logging in/out only ever touches the ::authenticated? fact — deliberately
  does NOT reset ::active-tab, so logging back in returns to whatever tab was
  open before (matches ordinary desktop-app expectations; verified in
  dev/verify_nav.clj)."
  [session authenticated?]
  (-> session (o/insert ::session ::authenticated? authenticated?) o/fire-rules))

(defn set-active-tab [session tab]
  (-> session (o/insert ::nav ::active-tab tab) o/fire-rules))
