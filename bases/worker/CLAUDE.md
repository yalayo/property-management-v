# Worker Base

## Runtime: Cloudflare Workers
- No Node.js APIs — use Web APIs only
- Entry point: src/worker/core.cljs (ClojureScript)
- Build: `npx shadow-cljs release worker`
- Deploy: `wrangler deploy`

## Key constraints
- No filesystem access
- Use `js/fetch` not Node http
- Secrets via `wrangler secret put`
- wrangler.toml defines routes and bindings