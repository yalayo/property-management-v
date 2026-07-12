(ns app.controller.features-fugato
  "Stateful model-based tests (fugato) for the feature-flag system.

  Two layers:
  1. `defspec` — the model's projected state must agree with the pure resolver
     (app.controller.features) after any generated admin-command sequence.
  2. async `deftest` — the same command sequences are replayed for real through
     `app.controller.core/dispatch` against the in-memory storage
     (:app.storage.interface/memory), and `:get-org-features` must return
     exactly what the model predicts."
  (:require [clojure.test :refer [deftest is async]]
            [clojure.test.check.generators :as gen]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]
            [fugato.core :as fugato]
            [integrant.core :as ig]
            [app.storage.interface :as storage-iface]
            [app.controller.core :as controller]
            [app.controller.features :as features]))

;; ─── Model ────────────────────────────────────────────────────────────────────
;; state: {:catalog {key {:enabled bool :default-on bool}} :overrides {key bool}}
;; The catalog starts as the canonical seed — exactly what ensure-features-seeded!
;; produces on first contact with an empty database.

(def initial-state
  {:catalog   (into {} (map (fn [f] [(:key f) {:enabled true :default-on true}])
                            features/canonical-features))
   :overrides {}})

(def new-feature-pool
  ["mod-alpha" "mod-beta" "mod-gamma" "section-reports"])

(defn- available-new-keys [state]
  (vec (remove #(contains? (:catalog state) %) new-feature-pool)))

(def create-feature-spec
  {:run?       (fn [state] (seq (available-new-keys state)))
   :args       (fn [state] (gen/tuple (gen/elements (available-new-keys state)) gen/boolean))
   :next-state (fn [state {[k default-on] :args}]
                 (assoc-in state [:catalog k] {:enabled true :default-on default-on}))
   :valid?     (fn [state {[k _] :args}]
                 (not (contains? (:catalog state) k)))})

(def toggle-feature-spec
  {:run?       (fn [state] (seq (:catalog state)))
   :args       (fn [state] (gen/tuple (gen/elements (vec (keys (:catalog state))))))
   :next-state (fn [state {[k] :args}]
                 (update-in state [:catalog k :enabled] not))
   :valid?     (fn [state {[k] :args}]
                 (contains? (:catalog state) k))})

(def set-override-spec
  {:run?       (fn [state] (seq (:catalog state)))
   :args       (fn [state] (gen/tuple (gen/elements (vec (keys (:catalog state)))) gen/boolean))
   :next-state (fn [state {[k v] :args}]
                 (assoc-in state [:overrides k] v))
   :valid?     (fn [state {[k _] :args}]
                 (contains? (:catalog state) k))})

(def clear-override-spec
  {:run?       (fn [state] (seq (:overrides state)))
   :args       (fn [state] (gen/tuple (gen/elements (vec (keys (:overrides state))))))
   :next-state (fn [state {[k] :args}]
                 (update state :overrides dissoc k))
   :valid?     (fn [state {[k] :args}]
                 (contains? (:overrides state) k))})

(def model
  {:create-feature create-feature-spec
   :toggle-feature toggle-feature-spec
   :set-override   set-override-spec
   :clear-override clear-override-spec})

;; ─── Model projections ────────────────────────────────────────────────────────

(defn model-enabled
  "Independently computed expected enabled-set (written as a comprehension, not
  via the production resolver, so the property is not tautological)."
  [{:keys [catalog overrides]}]
  (set (for [[k {:keys [enabled default-on]}] catalog
             :when (and enabled
                        (if (contains? overrides k)
                          (get overrides k)
                          default-on))]
         k)))

(defn state->entities
  "Project model state into the entity shapes the production resolver consumes."
  [{:keys [catalog overrides]}]
  {:features  (mapv (fn [[k {:keys [enabled default-on]}]]
                      {:feature/key k :feature/enabled enabled :feature/default-on default-on})
                    catalog)
   :overrides (mapv (fn [[k v]]
                      {:feature-override/feature-key k :feature-override/enabled v})
                    overrides)})

(defn end-state [commands]
  (or (some-> commands last meta :after) initial-state))

;; ─── Layer 1: model vs pure resolver ─────────────────────────────────────────

(defspec resolver-matches-model 100
  (prop/for-all [commands (fugato/commands model initial-state 20 1)]
    (let [state (end-state commands)
          {:keys [features overrides]} (state->entities state)]
      (= (model-enabled state)
         (set (features/resolve-enabled features overrides))))))

;; ─── Layer 2: model vs the real controller + in-memory storage ───────────────

(def ^:private test-email "sys@test.local")

(def ^:private seed-tx
  [{:db/id "acc-1" :db/type "account"
    :account/email test-email :account/name "System Test"}
   {:db/id "org-1" :db/type "organization"}
   {:db/id "mem-1" :db/type "membership"
    :membership/account-id "acc-1"
    :membership/organization-id "org-1"
    :membership/role "admin"}])

(def ^:private super-admin {:superadmin true :email "admin@test.local"})
(def ^:private org-user    {:org-id "org-1" :email test-email :role "admin"})

(defn- dispatch! [storage command data user]
  (controller/dispatch {:core nil :storage storage :command command
                        :data data :env nil :user user}))

(defn- feature-id [storage k]
  (-> ((:find-by-attr storage) :feature/key k) (.then first)))

(defn- apply-command!
  "Replay one model command through the real admin API."
  [storage {:keys [command args]}]
  (case command
    :create-feature
    (let [[k default-on] args]
      (dispatch! storage :admin-create-feature
                 {:key k :name k :description "generated" :category "module"
                  :default-on default-on}
                 super-admin))

    :toggle-feature
    (let [[k] args]
      (-> (feature-id storage k)
          (.then (fn [id]
                   (-> ((:pull storage) id '[*])
                       (.then (fn [f]
                                (dispatch! storage :admin-update-feature
                                           {:id id :enabled (not (:feature/enabled f))}
                                           super-admin))))))))

    :set-override
    (let [[k v] args]
      (dispatch! storage :admin-set-org-feature
                 {:email test-email :feature-key k :enabled v}
                 super-admin))

    :clear-override
    (let [[k] args]
      (dispatch! storage :admin-set-org-feature
                 {:email test-email :feature-key k :enabled nil}
                 super-admin))))

(defn- run-commands! [storage commands]
  (reduce (fn [p cmd] (.then p (fn [_] (apply-command! storage cmd))))
          (js/Promise.resolve nil)
          commands))

(defn- run-scenario!
  "Generate one command sequence, replay it for real, and compare the org's
  effective features with the model's prediction. Returns Promise<boolean>."
  []
  (let [commands (gen/generate (fugato/commands model initial-state 15 1))
        expected (model-enabled (end-state commands))
        storage  (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
    (-> (dispatch! storage :admin-list-features {} super-admin) ; seeds canonical catalog
        (.then (fn [_] (run-commands! storage commands)))
        (.then (fn [_] (dispatch! storage :get-org-features {} org-user)))
        (.then (fn [{:keys [features]}]
                 (let [actual (set features)]
                   (is (= expected actual)
                       (str "diverged for commands:\n"
                            (pr-str (mapv (juxt :command :args) commands))))
                   (= expected actual)))))))

(deftest feature-flags-system-matches-model
  (async done
    (letfn [(loop! [n]
              (if (zero? n)
                (done)
                (-> (run-scenario!)
                    (.then (fn [_] (loop! (dec n))))
                    (.catch (fn [e]
                              (is false (str "system scenario threw: " e))
                              (done))))))]
      ;; five independent randomized scenarios per test run
      (loop! 5))))

;; ─── Gate behaviour through the full dispatch stack ───────────────────────────

(deftest command-gate-blocks-disabled-section
  (async done
    (let [storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx})]
      (-> (dispatch! storage :admin-list-features {} super-admin)
          ;; force section-tenants off for the org
          (.then (fn [_] (dispatch! storage :admin-set-org-feature
                                    {:email test-email :feature-key "section-tenants" :enabled false}
                                    super-admin)))
          (.then (fn [_] (dispatch! storage :delete-tenant
                                    {:id "t-1"} org-user)))
          (.then (fn [result]
                   (is (= :feature-disabled (:error result)))
                   (is (= "section-tenants" (:feature result)))
                   ;; superadmin bypasses the same gate (handler then reports
                   ;; :not-found for the bogus tenant — but is NOT feature-blocked)
                   (dispatch! storage :delete-tenant {:id "t-1"}
                              (assoc org-user :superadmin true))))
          (.then (fn [result]
                   (is (not= :feature-disabled (:error result))
                       "superadmin must bypass feature gates")
                   (done)))
          (.catch (fn [e]
                    (is false (str "gate test threw: " e))
                    (done)))))))
