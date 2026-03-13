# Add Domain Feature: $ARGUMENTS

You are adding a new domain feature called **$ARGUMENTS** to this Polylith ClojureScript monorepo. This app has a Clojure/ClojureScript backend deployed as a Cloudflare Worker and a ClojureScript + React/TSX frontend deployed as Cloudflare Pages.

Work through the following checklist in order. Read each referenced existing file before creating anything — use `apartment` / `tenant` as your reference implementations.

---

## 1. Database Migration

Create `projects/cloudflare/migrations/000N_$ARGUMENTS.sql` (increment N from the latest file).

**Rules:**
- Table name prefix is always `props_` (e.g. `props_$ARGUMENTS`)
- Use `INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL` for `id`
- Foreign key columns: `INTEGER NOT NULL` with `FOREIGN KEY` constraint
- Use `TEXT` for strings, `INTEGER` for booleans (0/1) and numbers

**Guide:** read `projects/cloudflare/migrations/0004_apartments.sql` and `0005_tenants.sql`.

---

## 2. Backend Polylith Component

Create `components/$ARGUMENTS/` with this exact layout:

```
components/$ARGUMENTS/
  deps.edn
  cljs/app/$ARGUMENTS/
    interface.cljs
    routes.cljs
    handler.cljs
```

**`deps.edn`** — copy from `components/apartment/deps.edn` (paths: `["src" "cljs" "resources"]`).

**`handler.cljs`** — one function per route. Pattern from `components/apartment/cljs/app/apartment/handler.cljs`:
- `(ns app.$ARGUMENTS.handler (:require [app.worker.async :refer [js-await]] [app.worker.db :as db] [app.worker.cf :as cf]))`
- Use `db/query+` for reads, `db/run+` for writes
- Always return `(cf/response-edn {...} {:status 200/201})` or `(cf/response-error "...")`
- Parse path params: `(-> route :path-params :id)` then `(js/parseInt id 10)`
- Parse request body: `(js-await [data (cf/request->edn request)] ...)`

**`routes.cljs`** — define the route vector. Standard CRUD pattern:
```clojure
(def routes
  [["/entity-name"
    {:get  {:handler handler/get-all}
     :post {:handler handler/create}}]
   ["/entity-name/:id"
    {:put    {:handler handler/update}
     :delete {:handler handler/delete}}]])
```

**`interface.cljs`** — expose `get-routes` and register Integrant key:
```clojure
(ns app.$ARGUMENTS.interface
  (:require [integrant.core :as ig]
            [app.$ARGUMENTS.routes :as routes]))

(defn get-routes [] routes/routes)

(defmethod ig/init-key ::routes [_ _] routes/routes)
```

---

## 3. Wire Backend

**`projects/cloudflare/deps.edn`** — add `poly/$ARGUMENTS {:local/root "../../components/$ARGUMENTS"}` under `;; Bricks`.

**`projects/cloudflare/src/app/cloudflare/core.cljs`** — add:
- `[app.$ARGUMENTS.interface :as $ARGUMENTS]` to `:require`
- `::$ARGUMENTS/routes {}` to the config map
- `:$ARGUMENTS-routes (ig/ref ::$ARGUMENTS/routes)` to `::worker/handler`

**`bases/worker/src/app/worker/core.cljs`** — add `$ARGUMENTS-routes` to the `init` function destructuring and the `concat` expression.

---

## 4. Frontend TSX Components

Create `projects/frontend/ui/components/$ARGUMENTS/` with:

```
$ARGUMENTSList.tsx     — grid of cards, empty state, Dialog slot for AddForm
Add$ARGUMENTS.tsx      — react-hook-form + zod validated form (Dialog content)
Manage$ARGUMENTS.tsx   — edit + delete with confirmation dialog
```

**Validation pattern** (mandatory — use `react-hook-form` + `zod` exactly like `PropertyList.tsx`):
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  // add domain-specific fields...
});

type FormValues = z.infer<typeof schema>;
```

- Required fields: `z.string().min(1, "...")`
- Optional email: `z.union([z.string().email("..."), z.literal("")]).optional()`
- Optional numbers: `z.string().optional().transform(val => val ? parseInt(val, 10) : undefined)`
- Always use `<FormMessage />` under each field for inline error display
- Submit button disabled while `isLoading` is true
- `onSubmit(data: FormValues)` receives validated data — no individual field change handlers

**Guide:** read `projects/frontend/ui/components/tenants/AddTenant.tsx`, `TenantsList.tsx`, `ManageTenant.tsx`.

After writing, compile: `cd projects/frontend && npx babel ui --out-dir ./resources/js --extensions ".ts,.tsx,.jsx" --ignore "node_modules"`

---

## 5. Frontend Polylith Component (`$ARGUMENTS-ui`)

Create `components/$ARGUMENTS-ui/` with this layout:

```
components/$ARGUMENTS-ui/
  deps.edn
  src/app/$ARGUMENTS_ui/
    db.cljs
    config.cljs
    events.cljs
    subs.cljs
    views.cljs
    interface.cljs
```

**`deps.edn`** — copy from `components/tenant-ui/deps.edn` (paths: `["src" "resources"]`).

**`db.cljs`** and **`config.cljs`** — copy verbatim from `tenant-ui`, changing only the namespace.

**`events.cljs`** pattern:
```clojure
(ns app.$ARGUMENTS-ui.events
  (:require [re-frame.core :as re-frame :refer [after]]
            [day8.re-frame.http-fx]
            [ajax.edn :as ajax-edn]
            [app.$ARGUMENTS-ui.db :as db]
            [app.$ARGUMENTS-ui.config :as config]))

(def local-storage-interceptor (after db/db->local-store))
```
- Load: `::load-*` dispatches HTTP GET, `::*-loaded` updates `[:domain :list]` and `[:domain :loading?] false`
- Dialog: `::open-add-dialog` sets `[:domain :add-dialog-open?] true`, `::close-add-dialog` sets false
- Add: `::add-*` receives full data map `[_ data]` — **never** store individual form fields in Re-frame
- Select/Clear/Update/Delete follow the apartment-ui pattern exactly
- Error handlers: `(js/console.error "..." error)` then `{}`

**`subs.cljs`** — register subs for: `::items` (`[:domain :list]`), `::loading?`, `::saving?`, `::add-dialog-open?`, `::selected-id`.

**`views.cljs`** — form-2 Reagent component:
```clojure
(defn component [_]
  (re-frame/dispatch [::events/load-*])
  (fn [{:keys [...]}]
    (let [items   @(re-frame/subscribe [::subs/items])
          ...]
      (if selected-id
        [manage-component {...}]
        [list-component {...}
         (when add-dialog-open?
           (r/as-element
            [add-component
             {:onClose  #(re-frame/dispatch [::events/close-add-dialog])
              :onSubmit (fn [data]
                          (let [d (js->clj data :keywordize-keys true)]
                            (re-frame/dispatch [::events/add-* {:field (:field d)}])))}]))]))))
```

**`interface.cljs`** — expose `component` and `load-*`:
```clojure
(defn component [props] [views/component props])
(defn load-* [] (re-frame/dispatch [::events/load-*]))
```

---

## 6. Wire Frontend

**`projects/frontend/deps.edn`** — add `poly/$ARGUMENTS-ui {:local/root "../../components/$ARGUMENTS-ui"}`.

**`components/main-ui/src/app/main_ui/views.cljs`**:
- Add `[app.$ARGUMENTS-ui.interface :as $ARGUMENTS-ui]` to `:require`
- Add `:[feature]View (r/as-element [$ARGUMENTS-ui/component {...}])` to the `dashboard` props

**`projects/frontend/ui/pages/dashboard.tsx`**:
- Add `{activeTab === "[feature]" && props.[feature]View}` in `<main>`
- The nav item is already in `NAV_ITEMS` if you added it, otherwise add `{ id: "[feature]", label: "...", icon: ... }`

---

## 7. Final Checklist

- [ ] Migration file created with `props_` prefix
- [ ] Backend component: `handler.cljs`, `routes.cljs`, `interface.cljs`, `deps.edn`
- [ ] Backend wired: `cloudflare/deps.edn`, `cloudflare/core.cljs`, `worker/core.cljs`
- [ ] TSX components use `react-hook-form` + `zod` — no raw `onChange` handlers
- [ ] TSX compiled: `npx babel ui --out-dir ./resources/js ...`
- [ ] Frontend `$ARGUMENTS-ui` component: `events.cljs`, `subs.cljs`, `views.cljs`, `interface.cljs`
- [ ] Frontend wired: `frontend/deps.edn`, `main-ui/views.cljs`, `dashboard.tsx`
- [ ] `onSubmit(data)` dispatches with JS→CLJS converted map, using camelCase→kebab-case key mapping

---

## Key Gotchas

1. **Null safety in TSX**: always use `const safe = items ?? []` — ClojureScript `clj->js` on nil produces `null`, not `undefined`, so `= []` defaults don't protect.
2. **Babel must be run manually** after every TSX change before shadow-cljs picks it up.
3. **Re-frame form-2**: outer fn arg is `[_]`, inner fn receives real props every render.
4. **Cross-namespace dispatch**: use full qualified keyword `:app.other.events/event-name` — no require needed.
5. **`r/as-element`** wraps a Reagent hiccup vector into a React element for passing as a prop.
6. **Reagent children**: pass as additional args after the props map — `[component props child1 child2]`.
7. **Dialog accessibility**: `SheetContent` requires `<SheetTitle>` inside it (add `className="sr-only"` if visually hidden).
