/**
 * Side-effect module loaded first from vite.config.ts.
 *
 * On this monorepo, native FSEvents / fs.watch hit EMFILE even with
 * RLIMIT_NOFILE ~1M. Chokidar and the fsevents native addon open watchers
 * that emit 'error' — an unhandled 'error' on EventEmitter kills Node.
 *
 * Opt out: VITE_USE_POLLING=0
 */
import { EventEmitter } from "node:events";
import fs from "node:fs";

const preferPolling = process.env.VITE_USE_POLLING !== "0";

function isWatchEmfile(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as NodeJS.ErrnoException;
  return (
    (e.code === "EMFILE" || e.code === "ENOSPC") &&
    (e.syscall === "watch" || /too many open files, watch/i.test(String(e.message)))
  );
}

if (preferPolling) {
  process.env.CHOKIDAR_USEPOLLING = "true";
  process.env.CHOKIDAR_INTERVAL ??= "400";
  process.env.WATCHPACK_POLLING = "true";

  const originalEmit = EventEmitter.prototype.emit.bind(EventEmitter.prototype);
  EventEmitter.prototype.emit = function patchedEmit(
    this: EventEmitter,
    type: string | symbol,
    ...args: unknown[]
  ): boolean {
    if (type === "error" && isWatchEmfile(args[0])) {
      // eslint-disable-next-line no-console
      console.warn(
        "[watch-emfile] swallowed FSWatcher EMFILE (file watching may be degraded; HMR can be flaky)"
      );
      return false;
    }
    return originalEmit.apply(this, [type, ...args] as never);
  };

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
    "[watch-emfile] guard active (polling preferred; set VITE_USE_POLLING=0 to disable)"
  );
}
