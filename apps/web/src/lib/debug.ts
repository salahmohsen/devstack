import { log } from "@tsu-stack/logger/client";

type DebugDetails = Record<string, unknown> | undefined;

function isDevEnvironment() {
  return import.meta.env.DEV;
}

export function debug(scope: string, message: string, details?: DebugDetails) {
  if (!isDevEnvironment()) {
    return;
  }

  if (typeof details === "undefined") {
    log.info({ scope: scope, message: message });
    return;
  }

  log.info({ scope: scope, message: message, details });
}
