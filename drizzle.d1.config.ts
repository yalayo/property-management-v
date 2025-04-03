import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations/d1-drizzle",
  schema: "./shared/schema-d1.ts", // Use the D1-compatible schema
  dialect: "sqlite",
  // No need for dbCredentials when generating SQLite migrations
});