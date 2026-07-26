/**
 * CJS preload for Node (`--require` / NODE_OPTIONS).
 * Must run before Vite, chokidar, or any ESM package binds `fs.watch`.
 *
 * Why CJS: ESM `import { watch } from "node:fs"` freezes the function
 * reference at load time. Patching `fs.watch` later does not update those
 * bindings. A --require preload runs first and patches the exports object
 * so subsequent named imports still see the wrapper.
 *
 * Also swallows EMFILE/ENOSPC watch errors that would otherwise kill Node
 * as uncaughtException / unhandled 'error' events.
 */
"use strict";

const { EventEmitter } = require("node:events");
const fs = require("node:fs");

const forcePolling = process.env.VITE_USE_POLLING === "1";

function isWatchEmfile(err) {
  if (!err || typeof err !== "object") return false;
  const code = err.code;
  const syscall = err.syscall;
  const message = String(err.message ?? "");
  return (
    (code === "EMFILE" || code === "ENOSPC") &&
    (syscall === "watch" || /too many open files.*watch/i.test(message) || /watch/i.test(message))
  );
}

if (forcePolling) {
  process.env.CHOKIDAR_USEPOLLING = "true";
  process.env.CHOKIDAR_INTERVAL = process.env.CHOKIDAR_INTERVAL ?? "400";
  process.env.WATCHPACK_POLLING = "true";
}

function makeStubWatcher() {
  const stub = new EventEmitter();
  stub.close = () => undefined;
  stub.ref = () => stub;
  stub.unref = () => stub;
  return stub;
}

function attachErrorHandler(watcher, filename) {
  if (!watcher || typeof watcher.on !== "function") return watcher;
  watcher.on("error", (err) => {
    if (isWatchEmfile(err)) {
      // eslint-disable-next-line no-console
      console.warn(`[fs.watch] ${err.code} (ignored):`, String(filename));
      try {
        watcher.close?.();
      } catch {
        // ignore
      }
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(`[fs.watch] error:`, String(filename), err);
  });
  return watcher;
}

function patchWatch(name, original) {
  if (typeof original !== "function") return original;
  return function patchedWatch(filename, options, listener) {
    try {
      let watcher;
      if (typeof options === "function") {
        watcher = original.call(fs, filename, options);
      } else if (listener !== undefined) {
        watcher = original.call(fs, filename, options, listener);
      } else {
        watcher = original.call(fs, filename, options);
      }
      return attachErrorHandler(watcher, filename);
    } catch (err) {
      if (isWatchEmfile(err)) {
        // eslint-disable-next-line no-console
        console.warn(`[fs.watch] EMFILE failed (stubbed):`, String(filename));
        return makeStubWatcher();
      }
      throw err;
    }
  };
}

const originalWatch = fs.watch.bind(fs);
const originalWatchFile = fs.watchFile.bind(fs);

const patched = patchWatch("watch", originalWatch);
patched.__emfilePatched = true;
fs.watch = patched;

// watchFile is less common but can also EMFILE
fs.watchFile = function patchedWatchFile(filename, options, listener) {
  try {
    if (typeof options === "function") {
      return originalWatchFile(filename, options);
    }
    return originalWatchFile(filename, options, listener);
  } catch (err) {
    if (isWatchEmfile(err)) {
      // eslint-disable-next-line no-console
      console.warn(`[fs.watchFile] EMFILE failed (ignored):`, String(filename));
      return undefined;
    }
    throw err;
  }
};

// Last resort: do not kill the process for watch EMFILE (Vite can continue).
// Other uncaught exceptions still exit.
process.on("uncaughtException", (err) => {
  if (isWatchEmfile(err)) {
    // eslint-disable-next-line no-console
    console.warn("[watch-emfile] swallowed uncaughtException:", err.message);
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

// eslint-disable-next-line no-console
console.info(
  forcePolling
    ? "[watch-emfile] CJS preload active + polling forced (VITE_USE_POLLING=1)"
    : "[watch-emfile] CJS preload active (native FSEvents; set VITE_USE_POLLING=1 only if needed)"
);
