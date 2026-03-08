npm i # install NPM deps
npm run dev # run dev build in watch mode with CLJS REPL
npx wrangler dev # run Cloudflare server at http://localhost:8787
npx wrangler dev --test-scheduled # to test crons locally

## Local database
# Initialize migrations
npx wrangler d1 migrations create db-name (file name)

# Run the migrations locally
npx wrangler d1 migrations apply db-name --local

Note:
Command to see all the tables
npx wrangler d1 execute db-name --local --command "SELECT name FROM sqlite_master WHERE type='table';"
