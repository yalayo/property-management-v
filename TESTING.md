# Testing Guide

This workspace tests the backend (Cloudflare Worker + components) with **ClojureScript
tests running on Node**, in three layers: pure **unit tests**, **integration tests**
against the in-memory storage, and model-based **system tests** with
[fugato](https://github.com/vouch-opensource/fugato) + test.check.

## Running the tests

```bash
cd projects/cloudflare
npm test        # = shadow-cljs compile test && node out/test/node-tests.js
```

Frontend safety checks (no JS unit-test runner is set up yet):

```bash
cd projects/frontend
npx shadow-cljs compile home     # compiles all CLJS incl. re-frame events/views
npx tsc --noEmit -p tsconfig.json # (tsconfig include path is currently stale; see below)
```

## Where tests live and how they are discovered

- Each brick keeps its tests in `<brick>/test/…` (mirrors the source ns with a
  `-test` suffix, or a fugato model suite named `….fugato` / `…-fugato`).
- The test classpath is assembled in `projects/cloudflare/deps.edn` under the
  `:test` alias → `:extra-paths`. **A new brick's `test` dir must be added there**
  (tools.deps prints a "deprecated external path" warning — harmless).
- Discovery is by namespace regex in `projects/cloudflare/shadow-cljs.edn`:
  `:ns-regexp "(-test|fugato)$"`. Note the key is **`:ns-regexp`** — `:ns-regex`
  is silently ignored by shadow-cljs.
- Test-only deps (test.check, fugato, etaoin, testcontainers) live in the same
  `:test` alias; shadow picks them up via `:deps {:aliases [:dev :test]}`.

### Gotchas

- After changing `shadow-cljs.edn` deps/aliases or `deps.edn`, run
  `npx shadow-cljs stop` first — a running shadow server keeps the old
  classpath (symptom: `Ran 0 tests`).
- ClojureScript does **not** support `(:require [clojure.test :refer :all])` —
  always refer explicit symbols: `[clojure.test :refer [deftest is testing async]]`.
- clojure-lsp flags `defspec` names as "unresolved symbol" — lint noise, the
  compiler is fine with them.

## Layer 1 — Unit tests (pure functions)

Test pure namespaces directly with `deftest` plus test.check properties
(`defspec`). Keep domain logic in side-effect-free namespaces so it stays unit-
testable — e.g. feature-flag resolution lives in `app.controller.features`
(no storage, no promises), separated from the promise-based handlers in
`app.controller.core`.

Template: [`components/controller/test/app/controller/features_test.cljs`](components/controller/test/app/controller/features_test.cljs)

```clojure
(deftest feature-effective-truth-table …)          ; example-based

(defspec master-switch-dominates-and-override-wins 200
  (prop/for-all [enabled gen/boolean …] …))        ; property-based
```

## Layer 2 — Integration tests (handlers + in-memory storage)

The storage component ships an in-memory implementation that mirrors the D1/EAV
backend and resolves everything with `js/Promise`:

```clojure
(:require [integrant.core :as ig]
          [app.storage.interface :as storage-iface]
          [app.controller.core :as controller])

(def storage (ig/init-key ::storage-iface/memory {:tx-data seed-tx}))

(controller/dispatch {:core nil :storage storage :command :get-org-features
                      :data {} :env nil :user {:org-id "org-1"}})
;; => Promise<{:features [...]}>
```

- Seed accounts/orgs/memberships via `:tx-data` (see `seed-tx` in the fugato
  suite for the minimal shape).
- Everything is async: wrap assertions in cljs.test's `(async done …)` and
  chain with `.then` / `.catch`; **always call `done` exactly once**.
- `dispatch` goes through the real trial gate and feature gate — ideal for
  testing authorization behaviour (e.g. `{:error :feature-disabled}`).
- Handlers that need the o'doyle rules engine (`core` argument — most
  `create-*`/`update-*` of property/apartment/tenant/garage) cannot run with
  `:core nil`; prefer storage-only commands (deletes, feature/team/trial
  commands) in dispatch-level tests, or construct the rules engine.

## Layer 3 — System tests (fugato model-based)

fugato generates *command sequences* from a model (`{:run? :args :next-state
:valid?}` per command) and lets us compare an independent model of the system
against reality. Two patterns are in use:

1. **Model vs pure logic** (`defspec`, synchronous):
   generate sequences, fold them through the model, and assert the pure
   production code agrees with an independently-written projection.
2. **Model vs the real system** (async `deftest`):
   generate sequences with `gen/generate` *outside* the property (test.check
   properties cannot await promises), replay each command through
   `controller/dispatch` against `::storage-iface/memory`, then compare the
   final observable state with the model's prediction.

Templates:
- [`components/controller/test/app/controller/features_fugato.cljs`](components/controller/test/app/controller/features_fugato.cljs)
  — feature-flag admin model: catalog create/toggle + per-org overrides,
  verified against both the pure resolver and the full dispatch stack, plus
  gate-behaviour and public-endpoint scenarios.
- [`components/letter/test/app/letter/fugato.cljs`](components/letter/test/app/letter/fugato.cljs)
  — Nebenkosten billing model vs the o'doyle rules session.

Guidelines:
- Write the model's expected-state function **independently** (comprehension
  instead of reusing the production resolver) so properties aren't tautologies.
- Guard `(-> commands last meta :after)` with a fallback to the initial state —
  fugato may generate an empty sequence.
- Keep `defspec` run counts moderate (20–200); the whole suite should stay in
  seconds.

## E2E / browser tests (future)

`etaoin` (WebDriver) and `testcontainers` are already on the `:test` alias for
future end-to-end coverage (real browser against a `wrangler dev`/miniflare
stack). Not wired up yet.

## Frontend notes

- React components (`projects/frontend/ui/**`) are typechecked, not unit-tested.
  `projects/frontend/tsconfig.json` still points at a non-existent
  `../../client/src` — targeted checks work:
  `npx tsc --noEmit --jsx react-jsx --esModuleInterop --skipLibCheck --moduleResolution bundler --module esnext --target es2020 ui/components/<file>.tsx`
- CLJS UI bricks (re-frame events/subs/views, o'doyle nav rules) compile via the
  `home` build; brick `test/` dirs exist but there is no frontend test build yet
  — mirror the cloudflare `:test` build in `projects/frontend/shadow-cljs.edn`
  (target `:browser-test` or `:node-test`) when needed.
