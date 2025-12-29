import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(pool, { schema });

// 👉 MIGRACIONES AUTOMÁTICAS
(async () => {
  try {
    console.log("⏳ Running database migrations...");
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../migrations"),
    });
    console.log("✅ Database migrations completed");
  } catch (err) {
    console.error("❌ Migration error:", err);
  }
})();

