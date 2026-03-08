# Web Base

## Runtime: Cloudflare Pages
- Static assets + Pages Functions
- Build output: public/
- Build: `npx shadow-cljs release app`
- Deploy: `wrangler pages deploy public/`

## API calls
- Use relative /api/* paths in production