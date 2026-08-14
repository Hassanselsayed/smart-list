import "dotenv/config";
import pg from "pg";

export const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

export const initializeDatabase = async () => {
  await db.connect();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      due_date DATE,
      completed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await db.query(
    "ALTER TABLE items ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;"
  );
};
