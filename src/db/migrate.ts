import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle(pool);

  console.log("Running migrations against", databaseUrl.replace(/:[^:@]+@/, ":***@"));
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
