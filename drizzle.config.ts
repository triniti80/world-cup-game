import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://worldcup:changeme-in-real-deploy@localhost:5432/worldcup",
  },
  strict: true,
  verbose: true,
});
