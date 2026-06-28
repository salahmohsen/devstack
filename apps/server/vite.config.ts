import { cloudflare } from "@cloudflare/vite-plugin";
import { type Plugin, defineConfig } from "vite-plus";

import { normalizeUrlString } from "@tsu-stack/env/utils/url";

const DEFAULT_SERVER_URL = "http://localhost:5001";
const configuredServerUrl =
  process.env.VITE_SERVER_URL ??
  (process.env.NODE_ENV === "production" ? undefined : DEFAULT_SERVER_URL);

const devServerPort = configuredServerUrl
  ? Number(new URL(normalizeUrlString(configuredServerUrl)).port || 5000)
  : 5000;

// Cloudflare Workers (with `nodejs_compat`) do not expose `require` at
// runtime. Rolldown externalizes Node.js built-ins and either emits
// `__require("fs")` calls (which fail at runtime in Workers — there's
// no `require`) or leaves them as ESM imports that resolve to nothing
// in the bundle. The `nodejs_compat` flag provides `node:path`,
// `node:os`, `node:url`, and similar modules, so we redirect
// bare-specifier imports to the `node:`-prefixed forms for the modules
// Workers actually supports. For modules Workers does not support
// (`fs`, `http`, `https`, `stream`, `querystring`, `child_process`,
// `cluster`, `worker_threads`, `dgram`, `net`, `tls`, `dns`), we emit
// a Proxy stub.
// See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules.
const STUB_MODULE_ID = "\0node-builtin-stub";
const PATH_MODULE_ID = "\0node-path-redirect";

// Cloudflare Workers has no `require` at runtime, but rolldown emits
// `__require("fs")` calls inside inlined CJS chunks — the CJS
// `require` calls are not transformed away even when the package is
// inlined via `noExternal`. The rolldown runtime's `__require` checks
// `typeof require !== "undefined"` first; if `require` is defined, it
// delegates to it. We exploit that by injecting a global `require`
// polyfill at the top of every chunk that returns the stub for Node.js
// built-ins. The rest of the bundle uses ESM imports, not CJS require,
// so this polyfill is a no-op for non-built-in modules. See
// https://rolldown.rs/in-depth/bundling-cjs#require-external-modules.
const REQUIRE_POLYFILL_BANNER = `
if (typeof globalThis.require === "undefined") {
  // For Node.js built-ins not supported by Cloudflare Workers
  // (fs, child_process, stream, etc.) and for any leftover CJS
  // requires from inlined packages, we return a Proxy that yields
  // a no-op function for any property access. The methods we DO
  // need at runtime (path.join, os.tmpdir, url.URL, crypto, etc.)
  // are resolved through the ESM plugin's redirects to
  // \`node:path\` / \`node:os\` / \`node:url\` / \`node:crypto\`,
  // which Cloudflare provides via nodejs_compat. CJS code that
  // calls these stubs at runtime would return undefined — that's
  // a runtime error, not a module-load failure.
  const __stubModule = new Proxy(function(){}, { get: () => () => undefined });
  globalThis.require = function() { return __stubModule; };
}
`;

const stubNodeBuiltinsPlugin = (): Plugin => {
  // Bare-specifier imports of `path` get redirected to `node:path`
  // (supported by `nodejs_compat` in Workers). All other Node.js
  // built-ins either get a no-op Proxy stub or are aliased to a
  // `node:`-prefixed form that Workers supports.
  const pathModuleId = "node:path";

  // Built-ins Workers does NOT support — return a no-op Proxy.
  const noopBuiltinSpecifiers = new Set([
    "fs",
    "node:fs",
    "fs/promises",
    "node:fs/promises",
    "http",
    "node:http",
    "https",
    "node:https",
    "stream",
    "node:stream",
    "querystring",
    "node:querystring",
    "child_process",
    "node:child_process",
    "cluster",
    "node:cluster",
    "worker_threads",
    "node:worker_threads",
    "dgram",
    "node:dgram",
    "net",
    "node:net",
    "tls",
    "node:tls",
    "dns",
    "node:dns"
  ]);

  // Bare-specifier -> node: redirect for built-ins supported by
  // `nodejs_compat` so ESM `import { join } from "path"` resolves to
  // `node:path` (which the Workers runtime polyfills).
  const compatAliases: Record<string, string> = {
    path: pathModuleId,
    os: "node:os",
    url: "node:url"
  };

  return {
    name: "stub-node-builtins-for-workers",
    enforce: "pre",
    resolveId(source: string) {
      if (source === "path") {
        return { id: PATH_MODULE_ID, moduleSideEffects: false };
      }
      if (compatAliases[source]) {
        return { id: compatAliases[source], moduleSideEffects: false };
      }
      if (noopBuiltinSpecifiers.has(source)) {
        return { id: STUB_MODULE_ID, moduleSideEffects: false };
      }
      return null;
    },
    load(id: string) {
      if (id === STUB_MODULE_ID) {
        // ESM named imports need real, statically defined exports. The
        // Workers runtime has no filesystem / child_process / etc., so
        // any actual call to one of these at runtime would fail anyway
        // — these stubs only exist so the affected CJS packages can
        // complete their module load. We enumerate every named export
        // the rolldown bundler reports as missing and pair each with a
        // no-op that returns the safest type. The default export is a
        // Proxy so CJS-style `import fs from 'fs'` still resolves a
        // usable object for arbitrary property access.
        return `
const noop = () => undefined;
const returnEmpty = () => ({});
const returnEmptyArray = () => [];
const returnEmptyString = () => "";
const returnFalse = () => false;
const returnZero = () => 0;
const returnSelf = (p) => p;
const returnPromiseUndefined = () => Promise.resolve(undefined);

// fs (sync)
export const existsSync = returnFalse;
export const statSync = returnEmpty;
export const readFileSync = returnEmptyString;
export const realpathSync = returnSelf;
export const constants = returnEmpty;
export const mkdirSync = noop;
export const writeFileSync = noop;
export const renameSync = noop;
export const readdirSync = returnEmptyArray;
export const rmSync = noop;
export const lstatSync = returnEmpty;
export const accessSync = noop;
export const appendFileSync = noop;
export const chmodSync = noop;
export const chownSync = noop;
export const copyFileSync = noop;
export const fstatSync = returnEmpty;
export const ftruncateSync = noop;
export const futimesSync = noop;
export const linkSync = noop;
export const lutimesSync = noop;
export const mkdir = noop;
export const openSync = returnZero;
export const opendirSync = returnEmpty;
export const readlinkSync = returnEmptyString;
export const statfsSync = returnEmpty;
export const symlinkSync = noop;
export const truncateSync = noop;
export const unlinkSync = noop;
export const utimesSync = noop;
export const watch = returnEmpty;
export const createReadStream = returnEmpty;
export const createWriteStream = returnEmpty;

// fs/promises
export const mkdtemp = returnPromiseUndefined;
export const writeFile = returnPromiseUndefined;
export const rm = returnPromiseUndefined;
export const readFile = returnPromiseUndefined;
export const stat = returnPromiseUndefined;
export const access = returnPromiseUndefined;
export const appendFile = returnPromiseUndefined;
export const chmod = returnPromiseUndefined;
export const chown = returnPromiseUndefined;
export const copyFile = returnPromiseUndefined;
export const lstat = returnPromiseUndefined;
export const mkdir_p = returnPromiseUndefined;
export const readdir = returnPromiseUndefined;
export const readlink = returnPromiseUndefined;
export const realpath = returnPromiseUndefined;
export const rename = returnPromiseUndefined;
export const rmdir = returnPromiseUndefined;
export const statfs = returnPromiseUndefined;
export const symlink = returnPromiseUndefined;
export const truncate = returnPromiseUndefined;
export const unlink = returnPromiseUndefined;
export const utimes = returnPromiseUndefined;
export const open = returnPromiseUndefined;
export const opendir = returnPromiseUndefined;
export const constants_p = returnEmpty;
export const cp = returnPromiseUndefined;
export const glob = returnPromiseUndefined;
export const watch_p = returnEmpty;
export const createReadStream_p = returnEmpty;
export const createWriteStream_p = returnEmpty;

// child_process
export const execFileSync = returnEmptyString;
export const execSync = returnEmptyString;
export const spawnSync = returnEmpty;
export const exec = returnEmpty;
export const execFile = returnEmpty;
export const spawn = returnEmpty;
export const fork = returnEmpty;
export const ChildProcess = class {};

// stream
export const PassThrough = class {};
export const Readable = class {};
export const Writable = class {};
export const Duplex = class {};
export const Transform = class {};
export const Stream = class {};

// http / https
export const request = noop;
export const get = noop;
export const createServer = noop;
export const Agent = class {};
export const IncomingMessage = class {};
export const ServerResponse = class {};
export const ClientRequest = class {};
export const Server = class {};
export const METHODS = returnEmptyArray;
export const STATUS_CODES = returnEmpty;
export const globalAgent = returnEmpty;

// net
export const isIP = () => 0;
export const isIPv4 = () => false;
export const isIPv6 = () => false;
export const createServer_n = noop;
export const connect = noop;
export const Socket = class {};
export const Server_n = class {};

// tls
export const createSecureContext = noop;
export const createServer_t = noop;
export const connect_t = noop;
export const TLSSocket = class {};
export const TLSServer = class {};

// dns
export const lookup = returnPromiseUndefined;
export const resolve = returnPromiseUndefined;
export const resolve4 = returnPromiseUndefined;
export const resolve6 = returnPromiseUndefined;
export const resolveMx = returnPromiseUndefined;
export const resolveTxt = returnPromiseUndefined;
export const resolveSrv = returnPromiseUndefined;
export const resolveCname = returnPromiseUndefined;
export const resolveNs = returnPromiseUndefined;
export const reverse = returnPromiseUndefined;

// cluster
export const fork_c = noop;
export const isMaster = returnFalse;
export const isWorker = returnFalse;
export const settings = returnEmpty;
export const setupMaster = noop;
export const worker = returnEmpty;
export const workers = returnEmpty;
export const schedulingPolicy = returnZero;

// worker_threads
export const Worker = class {};
export const isMainThread = returnFalse;
export const parentPort = returnEmpty;
export const threadId = returnZero;
export const workerData = returnEmpty;
export const SHARE_ENV = returnZero;

// dgram
export const createSocket = noop;
export const Socket_d = class {};

// querystring
export const stringify = returnEmptyString;
export const parse = returnEmpty;
export const escape = returnSelf;
export const unescape = returnSelf;

// crypto (NOT stubbed — re-exported from node:crypto via the redirect
// table above; if we ever need to stub, the functions go here)
export const randomUUID = undefined;
export const createHash = undefined;
export const randomBytes = undefined;
export const randomInt = undefined;
export const randomFillSync = undefined;
export const timingSafeEqual = undefined;
export const createHmac = undefined;
export const createCipheriv = undefined;
export const createDecipheriv = undefined;

// fs default (namespace)
export const promises = {
  mkdtemp, writeFile, rm, readFile, stat, access, appendFile,
  chmod, chown, copyFile, lstat, mkdir: mkdir_p, readdir,
  readlink, realpath, rename, rmdir, statfs, symlink, truncate,
  unlink, utimes, open, opendir, cp, glob, watch: watch_p,
  constants: constants_p
};

const proxyTarget = new Proxy(function(){}, {
  get(_t, prop) {
    if (prop === "default") return proxyTarget;
    if (prop === "promises") return promises;
    if (prop === "constants") return constants;
    return noop;
  }
});
export default proxyTarget;
`;
      }
      if (id === PATH_MODULE_ID) {
        // Re-export `node:path` under the bare `path` specifier. The
        // `node:path` module is provided by the Workers `nodejs_compat`
        // polyfill at runtime.
        return "export * from 'node:path'; export { default } from 'node:path';";
      }
      return null;
    }
  };
};

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "cross-env IS_BUILD=true vp build"
      }
    }
  },
  build: {
    rollupOptions: {
      // Node.js built-ins (the `node:path`, `node:os`, `node:url` family)
      // are provided at runtime by the Cloudflare `nodejs_compat` polyfill.
      // Rolldown's default behavior is to try to resolve them as files on
      // disk during the bundle, which fails for the `node:`-prefixed form.
      // Marking them as external leaves the imports intact so Workers can
      // resolve them at runtime. Bare-specifier forms (`os`, `path`, `url`)
      // are still redirected to their `node:`-prefixed equivalents by the
      // plugin above before they reach the resolver.
      external: [
        /^node:/,
        "path",
        "os",
        "url",
        "util",
        "util/types",
        "events",
        "buffer",
        "stream",
        "string_decoder",
        "assert",
        "assert/strict",
        "async_hooks",
        "crypto",
        "diagnostics_channel",
        "process",
        "timers",
        "timers/promises"
      ],
      output: {
        // Inject a global `require` polyfill at the top of every chunk
        // so the rolldown runtime's `__require` function (which checks
        // `typeof require !== "undefined"` first) routes Node.js
        // built-in lookups to the stub. Without this, inlined CJS
        // chunks like gray-matter, probe-image-size, and the embedded
        // typescript compiler would throw a 10021 validation error at
        // runtime.
        banner: REQUIRE_POLYFILL_BANNER
      }
    }
  },
  ssr: {
    // Mark the CJS packages that internally call `require("fs")` (and
    // friends) as `noExternal` so the bundler inlines them as ESM
    // instead of leaving `__require` calls in the output. Cloudflare
    // Workers has no `require` at runtime, so any `__require("fs")` in
    // the bundle would fail with a 10021 validation error.
    noExternal: [
      "gray-matter",
      "probe-image-size",
      "needle",
      "stream-parser",
      "lodash.merge",
      /^typescript/
    ]
  },
  plugins: [
    stubNodeBuiltinsPlugin(),
    cloudflare({
      inspectorPort: false,
      // Use a dev-specific wrangler config that omits `routes` (production
      // routes break Miniflare's URL parser) and `migrations` (the v1 DO
      // migration was already applied remotely). Also drops the deployed
      // VITE_SERVER_URL/VITE_WEB_URL to localhost defaults so the Hono
      // app's CORS/trust logic doesn't 500 on the dev port.
      // See ADR-0014.
      configPath: "wrangler.dev.jsonc"
    })
  ] as Plugin[],

  server: {
    // Hono's CORS middleware should own preflight handling in dev; Hono docs
    // recommend disabling Vite's built-in CORS when using Hono with Vite:
    // https://hono.dev/middleware/builtin/cors
    cors: false,
    port: devServerPort
  }
});
