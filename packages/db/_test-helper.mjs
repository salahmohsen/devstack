#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";

// Usage: node _test-helper.mjs "SELECT 1"  /  node _test-helper.mjs -f /tmp/q.sql  /  cat foo.sql | node _test-helper.mjs -
// Uses Neon serverless over HTTP. Run from packages/db/ to resolve @neondatabase/serverless.
import { neon, Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(2);
}

const sql = neon(url);
const args = process.argv.slice(2);

let query;
if (args[0] === "-f") {
  query = fs.readFileSync(args[1], "utf8");
} else if (args[0] === "-") {
  query = fs.readFileSync(0, "utf8");
} else {
  query = args[0];
}

if (!query) {
  console.error("No query given");
  process.exit(2);
}

// Strip Drizzle's "--> statement-breakpoint" markers before sending
query = query.replace(/--> statement-breakpoint/g, "").trim();

const trimmed = query.trim().toUpperCase();

try {
  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH") || trimmed.startsWith("EXPLAIN")) {
    const rows = await sql.query(query);
    if (rows.length === 0) {
      console.log("(0 rows)");
    } else {
      // If only one column, print values one per line for jq-friendliness
      if (rows.length > 0 && Object.keys(rows[0]).length === 1) {
        const k = Object.keys(rows[0])[0];
        for (const r of rows) console.log(r[k]);
      } else {
        console.log(JSON.stringify(rows, null, 2));
      }
    }
  } else {
    // Use Pool for DDL (CREATE, DROP, ALTER, INSERT, UPDATE, DELETE)
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    try {
      await client.query(query);
      console.log("OK");
    } finally {
      client.release();
      await pool.end();
    }
  }
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
}
