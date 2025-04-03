import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations/d1-drizzle",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  // No need for dbCredentials when generating SQLite migrations
});