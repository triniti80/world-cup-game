import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Lazy singleton. Reading DATABASE_URL at module-load would break
// `next build`'s page-data-collection pass, which imports server modules
// without runtime env vars set. Init on first actual query instead.

type Db = NodePgDatabase<typeof schema>;

const globalForPool = globalThis as unknown as {
  __axiPgPool?: Pool;
  __axiDb?: Db;
};

function init(): Db {
  if (globalForPool.__axiDb) return globalForPool.__axiDb;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url, max: 10 });
  const drizzled = drizzle(pool, { schema });

  // Cache in development so HMR doesn't leak connections; in production the
  // module is loaded once anyway.
  if (process.env.NODE_ENV !== "production") {
    globalForPool.__axiPgPool = pool;
    globalForPool.__axiDb = drizzled;
  }
  return drizzled;
}

// Proxy lets callers `import { db }` and use it like a normal Drizzle handle;
// the real client is constructed on first property access.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = init();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Db;

export { schema };
