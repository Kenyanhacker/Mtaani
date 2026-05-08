const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { newDb } = require("pg-mem");

function createPgMemPool() {
  const db = newDb();
  const schemaSql = fs.readFileSync(path.resolve(__dirname, "../../sql/schema.sql"), "utf8");
  const seedSql = fs.readFileSync(path.resolve(__dirname, "../../sql/seed.sql"), "utf8");
  db.public.none(schemaSql);
  db.public.none(seedSql);
  const { Pool: MemPool } = db.adapters.createPg();
  return new MemPool();
}

const usePgMem = process.env.USE_PGMEM === "true" || !process.env.DATABASE_URL;

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === "true") return true;
  if (!connectionString) return false;
  return connectionString.includes("supabase.co");
}

const pool = usePgMem
  ? createPgMemPool()
  : new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined
  });

module.exports = {
  query: (text, params) => pool.query(text, params)
};
