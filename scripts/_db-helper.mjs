#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";

// Usage: node /tmp/db.mjs "SELECT 1"  /  node /tmp/db.mjs -f /tmp/q.sql  /  cat foo.sql | node /tmp/db.mjs -
// Uses Neon serverless over the WebSocket transport (works for any pg-client-shaped usage).
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { WebSocket } from "ws";

neonConfig.webSocketConstructor = WebSocket;

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

const trimmed = query.trim().toUpperCase();

try {
  if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH") || trimmed.startsWith("EXPLAIN")) {
    const rows = await sql(query);
    if (rows.length === 0) {
      console.log("(0 rows)");
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
  } else {
    // Use Pool for multi-statement (DDL like CREATE TABLE IF NOT EXISTS etc.)
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
