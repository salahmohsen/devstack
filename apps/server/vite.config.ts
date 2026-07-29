import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite-plus";

const root = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(root, "../../packages");
const monorepoRoot = path.resolve(root, "../..");
const appsRoot = path.resolve(root, "..");

/**
 * package.json `"imports"` values may be a string, a conditional object
 * (`{ default: "./x" }`), or a fallback array. Always normalize to a string.
 */
function importTargetToString(target: unknown): string | null {
  if (typeof target === "string") return target;
  if (Array.isArray(target)) {
    for (const entry of target) {
      const hit = importTargetToString(entry);
      if (hit) return hit;
    }
    return null;
  }
  if (target && typeof target === "object") {
    const map = target as Record<string, unknown>;
    for (const key of ["default", "node", "import", "require", "module"]) {
      const hit = importTargetToString(map[key]);
      if (hit) return hit;
    }
    for (const value of Object.values(map)) {
      const hit = importTargetToString(value);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Resolve package.json `"imports"` maps like `"#@/*": "./src/*.ts"` for
 * workspace packages. Node/tsx honor these; Vite's SSR graph does not unless
 * we teach it (vite-tsconfig-paths alone won't cover package `imports`).
 */
function packageImportsPlugin(): Plugin {
  const cache = new Map<string, { dir: string; imports: Record<string, unknown> } | null>();

  function normalizeImporter(importer: string): string {
    let value = importer;
    if (value.startsWith("file://")) {
      value = fileURLToPath(value);
    }
    // Strip vite query suffixes (?v=, ?t=, &...)
    const q = value.indexOf("?");
    if (q >= 0) value = value.slice(0, q);
    return value;
  }

  function isMonorepoPath(filePath: string): boolean {
    const normalized = path.resolve(filePath);
    return (
      normalized.startsWith(packagesRoot + path.sep) ||
      normalized.startsWith(appsRoot + path.sep) ||
      normalized === packagesRoot ||
      normalized === appsRoot
    );
  }

  function loadPackage(fromFile: string): { dir: string; imports: Record<string, unknown> } | null {
    let cur = path.dirname(fromFile);
    while (cur !== path.dirname(cur)) {
      if (cache.has(cur)) return cache.get(cur)!;
      // Never resolve `#@` against node_modules package.json maps (conditional objects).
      if (
        cur.includes(`${path.sep}node_modules${path.sep}`) ||
        cur.endsWith(`${path.sep}node_modules`)
      ) {
        cache.set(cur, null);
        cur = path.dirname(cur);
        continue;
      }
      if (!isMonorepoPath(cur) && cur !== monorepoRoot) {
        // Walk past non-workspace dirs until monorepo root or stop.
        if (!cur.startsWith(monorepoRoot)) {
          return null;
        }
      }
      const pkgPath = path.join(cur, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
            imports?: Record<string, unknown>;
          };
          const entry =
            pkg.imports && isMonorepoPath(cur) ? { dir: cur, imports: pkg.imports } : null;
          cache.set(cur, entry);
          return entry;
        } catch {
          cache.set(cur, null);
          return null;
        }
      }
      cur = path.dirname(cur);
    }
    return null;
  }

  function tryFile(resolved: string): string | null {
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
    for (const ext of [".ts", ".tsx", ".js", ".mjs", ".mts"]) {
      const withExt = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) return withExt;
    }
    // Directory index
    for (const index of ["index.ts", "index.tsx", "index.js"]) {
      const candidate = path.join(resolved, index);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  return {
    name: "tsu-package-imports",
    enforce: "pre",
    resolveId(id, importer) {
      // Rolldown may pass non-string ids in edge cases; never call string methods blindly.
      if (typeof id !== "string" || !id.startsWith("#") || typeof importer !== "string") {
        return null;
      }
      const pkg = loadPackage(normalizeImporter(importer));
      if (!pkg) return null;

      // Exact match
      if (pkg.imports[id] !== undefined) {
        const target = importTargetToString(pkg.imports[id]);
        if (target?.startsWith(".")) {
          return tryFile(path.resolve(pkg.dir, target));
        }
      }

      // Pattern match `#@/*` → `./src/*.ts` (or packages/ui: `./*.ts`)
      for (const [pattern, rawTarget] of Object.entries(pkg.imports)) {
        const target = importTargetToString(rawTarget);
        if (!target || !pattern.includes("*") || !target.includes("*")) continue;
        const prefix = pattern.slice(0, pattern.indexOf("*"));
        const suffix = pattern.slice(pattern.indexOf("*") + 1);
        if (!id.startsWith(prefix) || (suffix && !id.endsWith(suffix))) continue;
        const star = id.slice(prefix.length, suffix ? id.length - suffix.length : undefined);
        const targetPrefix = target.slice(0, target.indexOf("*"));
        const targetSuffix = target.slice(target.indexOf("*") + 1);
        // targetSuffix often includes extension (e.g. `.ts`); star is the path mid.
        const rel = `${targetPrefix}${star}${targetSuffix}`;
        const hit = tryFile(path.resolve(pkg.dir, rel));
        if (hit) return hit;
      }
      return null;
    }
  };
}

/**
 * Vite config for:
 * - production SSR build (`vp build` → dist/index.mjs)
 * - local dev via `vite-node --watch` (resolves + watches workspace packages)
 *
 * This is not browser HMR. vite-node restarts the Node process when watched
 * files change — same class of reload as tsx watch, but Vite’s module graph
 * includes `@tsu-stack/*` so new routers/schemas are picked up.
 */
export default defineConfig({
  root,
  plugins: [packageImportsPlugin()],
  // Do NOT add a global `resolve.alias` for `#@` — it rewrites every package's
  // `#@/*` imports to apps/server/src and breaks the monorepo. The
  // packageImportsPlugin resolves `#@/*` from each package's own package.json.
  server: {
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.mastra/**", "**/coverage/**"]
    },
    fs: {
      allow: [root, packagesRoot, monorepoRoot]
    }
  },
  build: {
    ssr: "src/index.ts",
    outDir: "dist",
    rollupOptions: {
      output: {
        entryFileNames: "index.mjs"
      }
    }
  },
  ssr: {
    // Keep workspace packages in the SSR graph so edits invalidate + restart.
    noExternal: [/@tsu-stack/, /@noble/],
    external: ["pg", "pg-native", "ioredis", "bullmq", "pdfnative"]
  },
  optimizeDeps: {
    exclude: ["pg", "pg-native", "ioredis", "bullmq", "pdfnative"]
  }
});
