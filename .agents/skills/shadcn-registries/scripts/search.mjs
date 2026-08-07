#!/usr/bin/env node
/**
 * Search the official shadcn open-source registry index.
 *
 * Sources:
 *   - Index: https://ui.shadcn.com/r/registries.json (~267 namespaces)
 *   - Meta:  @shoogle (cross-registry search engine)
 *   - Per-namespace: pnpm dlx shadcn@latest search <ns> -q <query> --json
 *
 * Usage:
 *   node search.mjs list [--query <text>] [--limit N]
 *   node search.mjs search <query> [--mode shoogle|all|project] [--registries @a,@b] [--type ui,block] [--limit N] [--concurrency N] [--cwd <path>]
 *   node search.mjs info <namespace>
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const INDEX_URL = "https://ui.shadcn.com/r/registries.json";
const DEFAULT_CWD_CANDIDATES = ["packages/ui", "apps/web", "."];

function usage(exit = 1) {
  console.error(`Usage:
  node search.mjs list [--query <text>] [--limit N]
  node search.mjs search <query> [options]
  node search.mjs info <namespace>

search options:
  --mode <shoogle|all|project>   default: shoogle (fast meta). all = every index ns. project = components.json only
  --registries <@a,@b>           limit to these namespaces (implies mode=all for those)
  --type <ui,block,hook,...>     filter item types (registry:ui or ui both accepted)
  --limit <N>                    max items to return (default 40)
  --per-registry <N>             items to pull per registry (default 20)
  --concurrency <N>              parallel registry searches (default 8)
  --cwd <path>                   project with components.json
  --json                         always print JSON (default)
`);
  process.exit(exit);
}

async function fetchJson(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "tsu-stack-shadcn-registries-search/1.0"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function loadIndex() {
  const data = await fetchJson(INDEX_URL);
  if (!Array.isArray(data)) throw new Error("Unexpected registries.json shape");
  return data;
}

function resolveCwd(explicit) {
  if (explicit) return resolve(explicit);
  for (const c of DEFAULT_CWD_CANDIDATES) {
    const p = resolve(process.cwd(), c);
    if (existsSync(resolve(p, "components.json"))) return p;
  }
  return process.cwd();
}

function run(cmd, args, { cwd, timeoutMs = 45000 } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ code: 1, stdout, stderr: String(err) });
    });
  });
}

async function shadcnSearch(namespaces, query, { cwd, limit, type, timeoutMs = 45000 }) {
  const args = [
    "dlx",
    "shadcn@latest",
    "search",
    ...namespaces,
    "-q",
    query,
    "--json",
    "-l",
    String(limit),
    "-c",
    cwd
  ];
  if (type) {
    args.push("-t", type);
  }
  const { code, stdout, stderr } = await run("pnpm", args, { cwd, timeoutMs });
  if (code !== 0) {
    return {
      ok: false,
      error: (stderr || stdout || `exit ${code}`).trim().slice(0, 400),
      items: []
    };
  }
  try {
    const parsed = JSON.parse(stdout);
    return { ok: true, items: parsed.items ?? [], pagination: parsed.pagination };
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${e.message}`, items: [] };
  }
}

function normalizeTypeFilter(typeArg) {
  if (!typeArg) return null;
  return new Set(
    typeArg
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .flatMap((t) =>
        t.startsWith("registry:") ? [t, t.slice("registry:".length)] : [t, `registry:${t}`]
      )
  );
}

function itemMatchesType(item, typeSet) {
  if (!typeSet) return true;
  const t = (item.type || "").toLowerCase();
  const short = t.replace(/^registry:/, "");
  return typeSet.has(t) || typeSet.has(short);
}

function scoreItem(item, query) {
  const q = query.toLowerCase();
  const name = (item.name || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(q)) score += 50;
  if (desc.includes(q)) score += 15;
  // Prefer exact-ish component names over long block paths
  score -= Math.min(name.length, 40) * 0.1;
  return score;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function cmdList(args) {
  const { values } = parseArgs({
    args,
    options: {
      query: { type: "string", short: "q" },
      limit: { type: "string", short: "l", default: "0" }
    },
    allowPositionals: true
  });
  const index = await loadIndex();
  const q = (values.query || "").toLowerCase();
  let items = index;
  if (q) {
    items = index.filter((r) => {
      const hay = `${r.name} ${r.description || ""} ${r.homepage || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }
  const limit = Number(values.limit || 0);
  if (limit > 0) items = items.slice(0, limit);
  console.log(
    JSON.stringify(
      {
        source: INDEX_URL,
        total: items.length,
        indexTotal: index.length,
        registries: items.map((r) => ({
          name: r.name,
          homepage: r.homepage,
          url: r.url,
          description: r.description
        }))
      },
      null,
      2
    )
  );
}

async function cmdInfo(args) {
  const ns = args[0];
  if (!ns) usage();
  const index = await loadIndex();
  const name = ns.startsWith("@") ? ns : `@${ns}`;
  const hit = index.find((r) => r.name === name);
  if (!hit) {
    console.log(
      JSON.stringify(
        { found: false, name, message: "Not in official open-source registry index" },
        null,
        2
      )
    );
    process.exit(2);
  }
  console.log(JSON.stringify({ found: true, registry: hit }, null, 2));
}

async function cmdSearch(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      mode: { type: "string", default: "shoogle" },
      registries: { type: "string" },
      type: { type: "string", short: "t" },
      limit: { type: "string", short: "l", default: "40" },
      "per-registry": { type: "string", default: "20" },
      concurrency: { type: "string", default: "8" },
      cwd: { type: "string", short: "c" },
      json: { type: "boolean", default: true }
    },
    allowPositionals: true
  });

  const query = positionals[0] || values.query;
  if (!query) usage();

  const cwd = resolveCwd(values.cwd);
  const limit = Number(values.limit);
  const perRegistry = Number(values["per-registry"]);
  const concurrency = Number(values.concurrency);
  const typeSet = normalizeTypeFilter(values.type);
  const mode = values.registries ? "all" : values.mode || "shoogle";

  const errors = [];
  let searched = [];
  let rawItems = [];

  if (mode === "project") {
    searched = ["(project components.json)"];
    const res = await shadcnSearch([], query, {
      cwd,
      limit: Math.max(limit, perRegistry),
      type: values.type
    });
    if (!res.ok) errors.push({ registry: "project", error: res.error });
    rawItems = res.items;
  } else if (mode === "shoogle") {
    searched = ["@shoogle"];
    // Prefer direct HTTP for speed / rate-limit control; fall back to CLI.
    try {
      const url = `https://shoogle.dev/r/registry.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}&offset=0`;
      const data = await fetchJson(url, { timeoutMs: 20000 });
      rawItems = (data.items || []).map((item) => ({
        ...item,
        registry: item.registry || "@shoogle",
        // Prefer real registry install path when shoogle embeds it
        addCommandArgument:
          item.addCommandArgument ||
          (item.name?.includes("/") ? `@${item.name}` : `@shoogle/${item.name}`)
      }));
    } catch (e) {
      const res = await shadcnSearch(["@shoogle"], query, {
        cwd,
        limit: Math.min(limit, 100),
        type: values.type
      });
      if (!res.ok) errors.push({ registry: "@shoogle", error: res.error || String(e) });
      rawItems = res.items;
    }
  } else if (mode === "all") {
    const index = await loadIndex();
    let namespaces;
    if (values.registries) {
      namespaces = values.registries
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      namespaces = index.map((r) => r.name);
    }
    searched = namespaces;

    const results = await mapPool(namespaces, concurrency, async (ns) => {
      const res = await shadcnSearch([ns], query, {
        cwd,
        limit: perRegistry,
        type: values.type,
        timeoutMs: 30000
      });
      return { ns, res };
    });

    for (const { ns, res } of results) {
      if (!res.ok) {
        errors.push({ registry: ns, error: res.error });
        continue;
      }
      for (const item of res.items) {
        rawItems.push({
          ...item,
          registry: item.registry || ns
        });
      }
    }
  } else {
    usage();
  }

  // Deduplicate by addCommandArgument / registry+name
  const seen = new Set();
  let items = [];
  for (const item of rawItems) {
    if (!itemMatchesType(item, typeSet)) continue;
    const key = item.addCommandArgument || `${item.registry}/${item.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      name: item.name,
      type: item.type,
      description: item.description || null,
      registry: item.registry,
      addCommandArgument: item.addCommandArgument || `${item.registry}/${item.name}`,
      score: scoreItem(item, query)
    });
  }

  items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const totalBeforeCap = items.length;
  items = items.slice(0, limit);

  console.log(
    JSON.stringify(
      {
        query,
        mode,
        cwd,
        searchedRegistries: searched.length,
        matchedItems: totalBeforeCap,
        returned: items.length,
        failedRegistries: errors.length,
        items,
        errors: errors.slice(0, 30)
      },
      null,
      2
    )
  );
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === "-h" || cmd === "--help") usage(cmd ? 0 : 1);

if (cmd === "list") await cmdList(rest);
else if (cmd === "info") await cmdInfo(rest);
else if (cmd === "search") await cmdSearch(rest);
else usage();
