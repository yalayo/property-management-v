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