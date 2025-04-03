# German Landlord Property Management System

A comprehensive property management platform leveraging cutting-edge technology to simplify and enhance landlord-tenant interactions, with a focus on intuitive user experience and intelligent automation.

## Deployment Instructions

This application is configured to deploy to Cloudflare Workers with D1 SQL database for production environments. Development environments will continue to use PostgreSQL for local development.

### GitHub Actions Deployment

The application is set up to deploy automatically to Cloudflare Workers whenever code is pushed to the main branch. The GitHub Actions workflow will:

1. Create a D1 database if it doesn't exist
2. Get the D1 database ID and update the wrangler.toml file
3. Build the application
4. Deploy to Cloudflare Workers

### Required Secrets

To enable GitHub Actions deployment, you need to set the following repository secrets:

- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Workers and D1 permissions
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key
- `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key

You can set these in your GitHub repository by going to Settings > Secrets and variables > Actions > New repository secret.

### Manual Deployment

If you need to deploy manually:

1. Install Wrangler CLI:
   ```
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```
   wrangler login
   ```

3. Create a D1 database (if it doesn't exist):
   ```
   wrangler d1 create landlord_db
   ```

4. Update the database_id in wrangler.toml with the ID from your D1 database

5. Build the application:
   ```
   npm run build
   ```

6. Deploy to Cloudflare Workers:
   ```
   wrangler deploy --env production
   ```

## Development

For local development, the application will continue to use PostgreSQL as the database:

1. Start the development server:
   ```
   npm run dev
   ```

The application uses the environment variable `NODE_ENV` to determine which database connection to use:
- Development environment: Uses PostgreSQL connection from `DATABASE_URL`
- Production environment: Uses Cloudflare D1

## Database Structure

This application uses a dual schema approach to support both PostgreSQL in development and Cloudflare D1 (SQLite) in production:

### Schema Files

- `shared/schema.ts` - PostgreSQL schema definition used for local development
- `shared/schema-d1.ts` - SQLite-compatible schema used for Cloudflare D1 deployment

### Database Connection Logic

The application automatically switches between PostgreSQL and D1 based on the environment:

- In local development: Uses the PostgreSQL connection from `DATABASE_URL`
- In Cloudflare Workers: Uses D1 binding from wrangler.toml

The database connection is managed by:

- `server/db.ts` - PostgreSQL connection for development
- `server/db-cf.ts` - D1 connection for Cloudflare Workers
- `server/storage-init.ts` - Environment detection and connection management

## Troubleshooting

### D1 Migration Issues

If you encounter issues with D1 migrations during deployment:

1. Make sure migrations are in the correct directory:
   ```
   ./migrations/d1/001_initial_schema.sql
   ```

2. Always use the `--directory` parameter with wrangler D1 commands:
   ```
   wrangler d1 migrations apply landlord-db --directory=./migrations/d1
   ```

3. Check migration formats:
   - SQL syntax should be SQLite compatible (not PostgreSQL)
   - Tables should use `INTEGER PRIMARY KEY AUTOINCREMENT` instead of `serial PRIMARY KEY`
   - Boolean values should be `0` and `1` instead of `false` and `true`
   - `now()` should be replaced with `CURRENT_TIMESTAMP`

4. Verify your database exists and is properly linked in wrangler.toml
   ```
   wrangler d1 list
   ```

5. If you need to regenerate migrations:
   ```
   ./generate-d1-migrations.sh
   ```

6. To test D1 migrations locally without applying them:
   ```
   ./test-d1-migrations.sh
   ```
   This will:
   - Generate the migrations
   - Verify the directory structure
   - Show the command format that would be used

### SQLite vs. PostgreSQL Differences

When developing features that will be deployed to Cloudflare D1, be aware of these differences:

1. **Data Types:**
   - PostgreSQL has more data types than SQLite
   - SQLite has dynamic typing with fewer native types (TEXT, INTEGER, REAL, BLOB, NULL)
   - Boolean values in SQLite are stored as 0 and 1

2. **JSON Handling:**
   - PostgreSQL has native JSON types (jsonb)
   - SQLite stores JSON as TEXT and lacks native JSON functions
   - Our application handles JSON serialization/deserialization in application code

3. **Date/Time Handling:**
   - PostgreSQL has dedicated timestamp types with timezone support
   - SQLite stores dates as TEXT, ISO strings, or Unix timestamps
   - We use ISO string format in SQLite for consistency

4. **Enums:**
   - PostgreSQL supports custom enum types
   - SQLite uses TEXT with application-enforced constraints
   - We define allowed values as constants (e.g., `PAYMENT_STATUS`) for validation

5. **Migrations:**
   - Always test migrations locally with the D1 migration tool
   - Use `generate-d1-migrations.sh` to ensure SQLite compatibility

## Utility Scripts

The project includes several utility scripts to help with development and deployment:

1. **generate-d1-migrations.sh**
   - Generates SQLite-compatible migrations for Cloudflare D1
   - Creates the migration file in `migrations/d1/001_initial_schema.sql`
   - Uses the SQLite-specific schema from `shared/schema-d1.ts`

2. **test-d1-migrations.sh**
   - Tests the D1 migration process without applying changes
   - Verifies directory structure and command format

3. **deploy.sh**
   - Builds and deploys the application to Cloudflare Workers
   - Includes environment variable setup for Cloudflare Workers

4. **deploy-simple.sh**
   - Deploys a simplified version using `simplified-worker.ts`
   - Useful for testing basic functionality

5. **deploy-spa.sh**
   - Deploys just the SPA (Single Page Application) frontend
   - Uses `spa-worker.ts` which focuses on serving static assets