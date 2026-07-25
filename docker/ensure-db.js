#!/usr/bin/env node
// Creates the target database if it doesn't exist.
// Resolves `pg` from NODE_PATH and common monorepo install locations
// (Docker runtime keeps packages under /app/node_modules and apps/*/node_modules).

const { createRequire } = require("module");
const fs = require("fs");
const path = require("path");

function loadPg() {
  const bases = [];

  if (process.env.NODE_PATH) {
    for (const p of process.env.NODE_PATH.split(path.delimiter)) {
      if (p) bases.push(p);
    }
  }

  bases.push(
    "/app/node_modules",
    "/app/apps/agent/node_modules",
    "/app/apps/server/node_modules",
    path.join(process.cwd(), "node_modules")
  );

  for (const base of bases) {
    const pkgJson = path.join(base, "pg", "package.json");
    if (!fs.existsSync(pkgJson)) continue;
    try {
      return createRequire(pkgJson)("pg");
    } catch {
      // try next base
    }
  }

  // Last resort — throws a clear MODULE_NOT_FOUND if still missing.
  return require("pg");
}

const { Pool } = loadPg();

const user = process.env.POSTGRES_USER;
const pass = process.env.POSTGRES_PASSWORD;
const db = process.env.POSTGRES_DB ?? "personal_hub";
const host = process.env.POSTGRES_HOST ?? "postgres";
const port = parseInt(process.env.POSTGRES_PORT ?? "5432", 10);

if (!user || !pass) {
  process.stderr.write("ensure-db: POSTGRES_USER and POSTGRES_PASSWORD are required\n");
  process.exit(1);
}

const pool = new Pool({ host, port, user, password: pass, database: "postgres" });

pool
  .query(`CREATE DATABASE "${db}"`)
  .then(() => {
    process.stdout.write(`Created database ${db}\n`);
    return pool.end();
  })
  .catch((err) => {
    // 42P04 = duplicate_database
    if (err && (err.code === "42P04" || /already exists/i.test(String(err.message)))) {
      process.stdout.write(`Database ${db} already exists\n`);
    } else {
      process.stderr.write(`ensure-db: ${err?.message ?? err}\n`);
    }
    return pool.end();
  });
