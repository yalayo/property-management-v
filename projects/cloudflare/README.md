## Test the scheduler locally
npx wrangler dev --test-scheduled

## Database
There should be some config in wrangler.toml to work with a local database in an environment that is not production

Execute this to run migrations: npx wrangler d1 migrations apply --local DB