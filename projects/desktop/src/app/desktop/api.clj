(ns app.desktop.api
  "Thin HTTP client for the real Cloudflare Worker — the desktop app talks the
  exact same /command EDN protocol the browser frontend uses
  (bases/worker/src/app/worker/handler.cljs `command` handler): POST EDN body
  {:command :... :data {...}}, optional `Authorization: Bearer <jwt>` header,
  EDN body back regardless of status code. No JWT verification/minting here —
  the token from :user-sign-in is opaque and just replayed on later calls."
  (:require [hato.client :as http]
            [clojure.edn :as edn]))

(def base-url
  "Override via DESKTOP_API_URL env var — defaults to a local `wrangler dev`."
  (or (System/getenv "DESKTOP_API_URL") "http://localhost:8787"))

(defn- post-command
  "Returns the parsed EDN response map, or {:error :offline} if the request
  couldn't be made at all (no network, server down, etc — the expected offline
  case, not a bug)."
  [command data jwt]
  (try
    (let [resp (http/post (str base-url "/api/command")
                           (cond-> {:body            (pr-str {:command command :data data})
                                    :headers         {"Content-Type" "text/edn"}
                                    :as              :string
                                    :throw-exceptions false
                                    :connect-timeout 5000}
                             jwt (assoc-in [:headers "Authorization"] (str "Bearer " jwt))))]
      (edn/read-string (:body resp)))
    (catch Exception e
      {:error :offline :message (.getMessage e)})))

(defn sign-in [email password]
  (post-command :user-sign-in {:user email :password password} nil))

(defn sync-push [jwt entities]
  (post-command :sync-push {:entities entities} jwt))

(defn sync-pull [jwt since-tx-id]
  (post-command :sync-pull {:since-tx-id since-tx-id} jwt))

(defn get-entities
  "Generic org-scoped read — command needs no params (org-id comes from the JWT
  server-side, e.g. :get-apartments, :get-tenants, :get-all-costs). Returns the
  raw response map (caller picks the right key, since a couple of these share
  a response shape, e.g. :get-all-costs and :get-all-apartment-costs both
  return {:costs [...]})."
  [jwt command]
  (post-command command {} jwt))
