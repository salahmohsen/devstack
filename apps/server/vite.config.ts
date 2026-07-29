import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite-plus";

const root = path.dirname(fileURLToPath(import.meta.url));
const packagesRoot = path.resolve(root, "../../packages");
const monorepoRoot = path.resolve(root, "../..");

/**
 * Resolve package.json `"imports"` maps like `"#@/*": "./src/*.ts"` for
 * workspace packages. Node/tsx honor these; Vite's SSR graph does not unless
 * we teach it (vite-tsconfig-paths alone won't cover package `imports`).
 */
function packageImportsPlugin(): Plugin {
  const cache = new Map<string, { dir: string; imports: Record<string, string> } | null>();

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

  function loadPackage(fromFile: string): { dir: string; imports: Record<string, string> } | null {
    let cur = path.dirname(fromFile);
    while (cur !== path.dirname(cur)) {
      if (cache.has(cur)) return cache.get(cur)!;
      const pkgPath = path.join(cur, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
            imports?: Record<string, string>;
          };
          const entry = pkg.imports ? { dir: cur, imports: pkg.imports } : null;
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
      if (!id.startsWith("#") || !importer) return null;
      const pkg = loadPackage(normalizeImporter(importer));
      if (!pkg) return null;

      // Exact match
      if (pkg.imports[id]) {
        const target = pkg.imports[id]!;
        if (target.startsWith(".")) {
          return tryFile(path.resolve(pkg.dir, target));
        }
      }

      // Pattern match `#@/*` → `./src/*.ts` (or packages/ui: `./*.ts`)
      for (const [pattern, target] of Object.entries(pkg.imports)) {
        if (!pattern.includes("*") || !target.includes("*")) continue;
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
