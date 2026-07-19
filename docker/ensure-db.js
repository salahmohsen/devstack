#!/usr/bin/env node
// Creates the target database if it doesn't exist.
// Uses the pg module from node_modules.
// Reads POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB from environment.

const { Pool } = require("pg");

const user = process.env.POSTGRES_USER;
const pass = process.env.POSTGRES_PASSWORD;
const db = process.env.POSTGRES_DB ?? "personal_hub";
const host = process.env.POSTGRES_HOST ?? "postgres";
const port = parseInt(process.env.POSTGRES_PORT ?? "5432", 10);

const pool = new Pool({ host, port, user, password: pass, database: "postgres" });

pool
  .query(`CREATE DATABASE "${db}"`)
  .then(() => {
    process.stdout.write(`Created database ${db}\n`);
    return pool.end();
  })
  .catch(() => {
    process.stdout.write(`Database ${db} already exists\n`);
    return pool.end();
  });
