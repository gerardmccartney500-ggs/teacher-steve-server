/* Postgres pool + auto-migration + first-boot seeding.
   Railway provides DATABASE_URL automatically when you add the Postgres plugin. */
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
});

const SEED_CLASSES = [
  { slug: "super-star",       name: "Super Star",       passcode: "1111" },
  { slug: "super-bee",        name: "Super Bee",        passcode: "2222" },
  { slug: "super-adventurer", name: "Super Adventurer", passcode: "3333" },
  { slug: "super-buddy",      name: "Super Buddy",      passcode: "4444" },
  { slug: "super-explorer",   name: "Super Explorer",   passcode: "5555" },
];

const SEED_TEACHERS = [
  { id: "steve", name: "Steve", pin: "5568", is_admin: true },
  { id: "khai",  name: "Khai",  pin: "0000", is_admin: false },
  { id: "sarah", name: "Sarah", pin: "0000", is_admin: false },
  { id: "chi",   name: "Chi",   pin: "0000", is_admin: false },
];

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS classes (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      passcode_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      class_slug TEXT NOT NULL REFERENCES classes(slug) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('weekly_update','homework','announcement','worksheet')),
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      file_url TEXT,
      file_name TEXT,
      link_url TEXT,
      teacher_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_class ON messages(class_slug, created_at DESC);
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Seed classes (only ones that don't exist yet — safe to re-run)
  for (const c of SEED_CLASSES) {
    await pool.query(
      `INSERT INTO classes (slug, name, passcode_hash)
       VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.name, bcrypt.hashSync(c.passcode, 10)]
    );
  }
  // Seed teachers
  for (const t of SEED_TEACHERS) {
    await pool.query(
      `INSERT INTO teachers (id, name, pin_hash, is_admin)
       VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [t.id, t.name, bcrypt.hashSync(t.pin, 10), t.is_admin]
    );
  }
  console.log("✅ Database migrated & seeded");
}

module.exports = { pool, migrate };
