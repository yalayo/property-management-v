# Polylith Clojure Monorepo

## Architecture
- Backend: Cloudflare Worker (bases/worker)
- Frontend: Cloudflare Pages (bases/web)
- Shared components in components/
- Projects in (projects/frontend, projects/cloudflare)

## Key Commands
- `cd projects/cloudflare && npm test` — run all backend tests (unit/integration/fugato; see TESTING.md)
- `clj -M:poly info` — show workspace status
- `clj -M:poly check` — validate architecture

## Testing
- See TESTING.md for the three test layers (unit, integration, system/fugato) and how to add tests for a new brick.

## Polylith Rules
- Components must never depend on bases
- Shared logic goes in components, not bases
- Each project composes its own deps