#!/usr/bin/env node
/**
 * File-scoped `vp check` / oxlint type-check misses some TS diagnostics
 * (e.g. TS2352) that only appear with a full package program. Run oxlint
 * type-check on each owning package, then fail only on errors in staged files.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsFile = /\.(?:[cm]?ts|tsx)$/;

const staged = process.argv
  .slice(2)
  .map((file) => path.relative(repoRoot, path.resolve(file)))
  .filter((file) => tsFile.test(file));

if (staged.length === 0) {
  process.exit(0);
}

const stagedSet = new Set(staged.map((file) => file.split(path.sep).join("/")));

function owningPackage(file) {
  let dir = path.dirname(path.join(repoRoot, file));
  while (dir.startsWith(repoRoot)) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "tsconfig.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** @type {Map<string, string[]>} */
const byPackage = new Map();
for (const file of staged) {
  const pkg = owningPackage(file);
  if (!pkg) continue;
  const list = byPackage.get(pkg) ?? [];
  list.push(file);
  byPackage.set(pkg, list);
}

if (byPackage.size === 0) {
  process.exit(0);
}

let failed = false;

for (const [pkgDir, files] of byPackage) {
  const tsconfig = path.join(pkgDir, "tsconfig.json");
  const srcDir = path.join(pkgDir, "src");
  const target = existsSync(srcDir) ? srcDir : pkgDir;
  const result = spawnSync(
    "vp",
    [
      "exec",
      "oxlint",
      "--type-aware",
      "--type-check",
      `--tsconfig=${tsconfig}`,
      "--format=json",
      "--quiet",
      target
    ],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  const stdout = result.stdout.trim();
  if (!stdout) {
    if (result.status !== 0) {
      console.error(result.stderr || `oxlint failed in ${path.relative(repoRoot, pkgDir)}`);
      failed = true;
    }
    continue;
  }

  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    console.error(result.stderr || stdout);
    failed = true;
    continue;
  }

  const stagedErrors = (payload.diagnostics ?? []).filter((diagnostic) => {
    if (diagnostic.severity !== "error") return false;
    const filename = String(diagnostic.filename ?? "")
      .split(path.sep)
      .join("/");
    return stagedSet.has(filename) || files.some((file) => filename.endsWith(file));
  });

  if (stagedErrors.length === 0) continue;

  failed = true;
  console.error(`Type errors in staged files (${path.relative(repoRoot, pkgDir)}):`);
  for (const diagnostic of stagedErrors) {
    const label = diagnostic.labels?.[0]?.span;
    const loc = label ? `${label.line}:${label.column}` : "?";
    console.error(`  ${diagnostic.filename}:${loc} ${diagnostic.code}: ${diagnostic.message}`);
  }
}

process.exit(failed ? 1 : 0);
