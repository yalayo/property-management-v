(ns app.core-ui.rules
  (:require [odoyle.rules :as o]
            [integrant.core :as ig]
            [reagent.core :as r]
            [app.core-ui.analytics :as analytics]))

(def rules
  (o/ruleset
   {;; Any authenticated admin goes to the dashboard
    ::set-section-authenticated-admin
    [:what
     [::session ::authenticated? true]
     [::user    ::role           :admin]
     :then
     (o/insert! ::nav ::current-section :admin-dashboard)]

    ;; Authenticated dispatcher also goes to the dashboard
    ::set-section-authenticated-dispatcher
    [:what
     [::session ::authenticated? true]
     [::user    ::role           :dispatcher]
     :then
     (o/insert! ::nav ::current-section :admin-dashboard)]

    ;; Any other authenticated role returns to landing
    ::set-section-authenticated-other
    [:what
     [::session ::authenticated? true]
     [::user    ::role           ?role]
     :when (and (not= ?role :admin) (not= ?role :dispatcher))
     :then
     (o/insert! ::nav ::current-section :landing)]

    ;; Unauthenticated, not submitting, no special intent → show landing
    ::set-section-landing
    [:what
     [::session ::authenticated? ?auth]
     [::nav     ::intent         ?intent]
     [::nav     ::submitting?    false]
     :when
     (and (not ?auth)
          (not= ?intent :auth)
          (not= ?intent :service-request))
     :then
     (o/insert! ::nav ::current-section :landing)]

    ;; Service request form — accessible regardless of auth state
    ::set-section-service-request
    [:what
     [::nav ::intent      :service-request]
     [::nav ::submitting? false]
     :then
     (o/insert! ::nav ::current-section :service-request)]

    ;; Explicit auth intent while unauthenticated and not submitting → show login/register
    ::set-section-auth
    [:what
     [::session ::authenticated? ?auth]
     [::nav     ::intent         :auth]
     [::nav     ::submitting?    false]
     :when
     (not ?auth)
     :then
     (o/insert! ::nav ::current-section :auth)]

    ;; Auth form in flight — full-page spinner only during auth submission
    ::set-section-submitting
    [:what
     [::session ::authenticated? false]
     [::nav     ::intent         :auth]
     [::nav     ::submitting?    true]
     :then
     (o/insert! ::nav ::current-section :submitting)]

    ;; Query rules — no side effects
    ::get-section
    [:what
     [::nav ::current-section section]
     :then false]

    ::get-auth-mode
    [:what
     [::ui ::auth-mode mode]
     :then false]}))

(defonce session
  (r/atom (-> (reduce o/add-rule (o/->session) rules)
              (o/insert ::session ::authenticated? false)
              (o/insert ::user    ::role           :guest)
              (o/insert ::nav     ::intent         :none)
              (o/insert ::nav     ::submitting?    false)
              (o/insert ::ui      ::auth-mode      "login")
              o/fire-rules)))

;; ── Public API ───────────────────────────────────────────────────────────────

(defn current-section []
  (:section (first (o/query-all @session ::get-section))))

(defn- current-auth-mode []
  (:mode (first (o/query-all @session ::get-auth-mode))))

(defn navigate-to! [intent]
  (swap! session #(-> %
                      (o/retract ::nav ::intent)
                      (o/insert ::nav ::intent intent)
                      o/fire-rules)))

(defn logout! []
  (swap! session #(-> %
                      (o/insert ::session ::authenticated? false)
                      (o/insert ::user    ::role           :guest)
                      (o/insert ::nav     ::intent         :auth)
                      o/fire-rules)))

(defn set-submitting! [v]
  (swap! session #(-> %
                      (o/insert ::nav ::submitting? v)
                      o/fire-rules)))

(defn set-auth-mode! [mode]
  (swap! session #(-> %
                      (o/insert ::ui ::auth-mode mode)
                      o/fire-rules)))

(defn insert-facts! [authenticated? role]
  (swap! session
         #(-> %
              (o/insert ::session ::authenticated? authenticated?)
              (o/insert ::user    ::role           role)
              (cond-> authenticated? (o/insert ::nav ::intent :none))
              o/fire-rules)))

;; ── Form command dispatch ─────────────────────────────────────────────────────

(defmulti form-command
  "Returns {:data-path [...] :cmd-type keyword} for the given form-id.
  Reads mode-dependent state from the odoyle session."
  identity)

(defmethod form-command :auth [_]
  {:data-path [:auth :form]
   :cmd-type  (if (= (current-auth-mode) "login") :sign-in :sign-up)})

(defmethod form-command :service-request [_]
  {:data-path [:service-request :form]
   :cmd-type  :submit-service-request})

;; ── Form success / failure multimethods ──────────────────────────────────────

(defmulti on-success!
  "Updates the odoyle session after a successful form submit."
  (fn [form-id _] form-id))

(defmethod on-success! :auth [_ {:keys [user]}]
  (let [role (keyword (get user :role "client"))]
    (swap! session
           #(-> %
                (o/insert ::session ::authenticated? true)
                (o/insert ::user    ::role           role)
                (o/insert ::nav     ::intent         :none)
                (o/insert ::nav     ::submitting?    false)
                o/fire-rules))))

(defmethod on-success! :service-request [_ _]
  ;; Navigation stays on :service-request; the form shows its own success state (step=99).
  ;; Just clear the global submitting flag so rules don't show the :submitting overlay.
  (swap! session #(-> % (o/insert ::nav ::submitting? false) o/fire-rules)))

(defmulti on-failure!
  "Updates the odoyle session after a failed form submit."
  (fn [form-id _] form-id))

(defmethod on-failure! :auth [_ _]
  (swap! session #(-> % (o/insert ::nav ::submitting? false) o/fire-rules)))

(defmethod on-failure! :service-request [_ _]
  (swap! session #(-> % (o/insert ::nav ::submitting? false) o/fire-rules)))

(defmulti success-db-update
  "Returns a fn [db response] → db for form-specific db updates on success."
  identity)

(defmethod success-db-update :auth [_]
  (fn [db {:keys [token user]}]
    (-> db
        (assoc-in [:user :logged-in?] true)
        (assoc-in [:user :token] token)
        (assoc-in [:user :info] user)
        (assoc-in [:auth :error] nil))))

(defmethod success-db-update :service-request [_]
  (fn [db {:keys [id]}]
    (-> db
        (assoc-in [:service-request :submitted-id] id)
        (assoc-in [:service-request :step] 99)
        (assoc-in [:service-request :error] nil))))

(defmulti failure-db-update
  "Returns a fn [db error] → db for form-specific db updates on failure."
  identity)

(defmethod failure-db-update :auth [_]
  (fn [db error]
    (assoc-in db [:auth :error]
              (or (get-in error [:response :error])
                  "Authentication failed"))))

(defmethod failure-db-update :service-request [_]
  (fn [db _]
    (assoc-in db [:service-request :error] "Submission failed. Please try again.")))

;; ── Integrant lifecycle ──────────────────────────────────────────────────────

(defmethod ig/init-key ::session [_ {:keys [authenticated? role]
                                     :or   {authenticated? false
                                            role           :guest}}]
  (insert-facts! authenticated? role)
  (add-watch session ::track-page-view
             (fn [_ _ old-val new-val]
               (let [old-section (:section (first (o/query-all old-val ::get-section)))
                     new-section (:section (first (o/query-all new-val ::get-section)))]
                 (when (and new-section (not= old-section new-section))
                   (analytics/page-view! new-section)))))
  ;; watch only fires on changes — push the already-resolved section as the first view
  (when-let [section (current-section)]
    (analytics/page-view! section))
  session)

(defmethod ig/halt-key! ::session [_ _]
  (remove-watch session ::track-page-view)
  (reset! session (-> (reduce o/add-rule (o/->session) rules)
                      (o/insert ::session ::authenticated? false)
                      (o/insert ::user    ::role           :guest)
                      (o/insert ::nav     ::intent         :none)
                      (o/insert ::nav     ::submitting?    false)
                      (o/insert ::ui      ::auth-mode      "login")
                      o/fire-rules)))
