# Polylith Clojure Monorepo

## Architecture
- Backend: Cloudflare Worker (bases/worker)
- Frontend: Cloudflare Pages (bases/web)
- Shared components in components/
- Projects in (projects/frontend, projects/cloudflare)

## Key Commands
- `clj -T:build test` — run all tests
- `clj -M:poly info` — show workspace status
- `clj -M:poly check` — validate architecture

## Polylith Rules
- Components must never depend on bases
- Shared logic goes in components, not bases
- Each project composes its own deps