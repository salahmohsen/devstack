/**
 * Side-effect module loaded first from vite.config.ts.
 *
 * On this monorepo, native FSEvents / fs.watch can hit EMFILE. An unhandled
 * 'error' on FSWatcher kills Node. We attach error handlers on fs.watch and
 * soft-stub when open fails with EMFILE.
 *
 * Do NOT monkey-patch EventEmitter.prototype.emit — even a pure passthrough
 * wrapper breaks Node HTTP event delivery on this stack (TCP accepts, no
 * response). That made localhost:3000 appear dead while `vp run dev` looked
 * healthy (server/agent still up).
 *
 * Prefer native FSEvents. Polling (VITE_USE_POLLING=1) has also left Vite
 * bound on :3000 without completing HTTP responses — only enable if native
 * watching is unusable:
 *   VITE_USE_POLLING=1 vp run dev
 */
import { EventEmitter } from "node:events";
import fs from "node:fs";

const forcePolling = process.env.VITE_USE_POLLING === "1";

function isWatchEmfile(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as NodeJS.ErrnoException;
  return (
    (e.code === "EMFILE" || e.code === "ENOSPC") &&
    (e.syscall === "watch" || /too many open files, watch/i.test(String(e.message)))
  );
}

if (forcePolling) {
  process.env.CHOKIDAR_USEPOLLING = "true";
  process.env.CHOKIDAR_INTERVAL ??= "400";
  process.env.WATCHPACK_POLLING = "true";
}

// Overload surface of fs.watch is awkward; keep the patch untyped at the edge.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalWatch = (fs.watch as any).bind(fs) as (...args: unknown[]) => fs.FSWatcher;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(fs as any).watch = function patchedWatch(
  filename: fs.PathLike,
  options?: unknown,
  listener?: unknown
): fs.FSWatcher {
  try {
    const watcher =
      typeof options === "function"
        ? originalWatch(filename, options)
        : listener !== undefined
          ? originalWatch(filename, options, listener)
          : originalWatch(filename, options);

    watcher.on("error", (err: NodeJS.ErrnoException) => {
      if (isWatchEmfile(err)) {
        // eslint-disable-next-line no-console
        console.warn(`[fs.watch] ${err.code} (ignored):`, String(filename));
        return;
      }
      // eslint-disable-next-line no-console
      console.warn(`[fs.watch] error:`, String(filename), err);
    });

    return watcher;
  } catch (err) {
    if (isWatchEmfile(err)) {
      // eslint-disable-next-line no-console
      console.warn(`[fs.watch] EMFILE failed (stubbed):`, String(filename));
      const stub = new EventEmitter() as unknown as fs.FSWatcher;
      stub.close = () => undefined;
      stub.ref = () => stub;
      stub.unref = () => stub;
      return stub;
    }
    throw err;
  }
};

// eslint-disable-next-line no-console
console.info(
  forcePolling
    ? "[watch-emfile] guard active + polling forced (VITE_USE_POLLING=1)"
    : "[watch-emfile] guard active (native FSEvents; set VITE_USE_POLLING=1 only if needed)"
);
