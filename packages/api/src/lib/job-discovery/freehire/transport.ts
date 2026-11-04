// oxlint-disable promise/no-callback-in-promise -- Node DNS lookup requires a callback adapter.
import { Resolver } from "node:dns/promises";

import { Agent } from "undici";

import { freehireNetworkCode } from "./errors";

const primary = new Agent({ connect: { timeout: 3_000 } });
const resolver = new Resolver({ timeout: 1_000, tries: 1 });
resolver.setServers(["8.8.8.8", "8.8.4.4"]);
let cached: { addresses: string[]; until: number } | undefined;

/** Scope the alternate DNS route to the public provider; TLS still checks freehire.me. */
const alternate = new Agent({
  connect: {
    timeout: 3_000,
    lookup: (hostname, options, callback) => {
      if (hostname !== "freehire.me") {
        callback(new Error("Alternate resolver is limited to freehire.me"), "", 4);
        return;
      }
      const addresses =
        cached && cached.until > Date.now()
          ? Promise.resolve(cached.addresses)
          : resolver.resolve4(hostname).then((values) => {
              cached = { addresses: values, until: Date.now() + 60_000 };
              return values;
            });
      void addresses
        .then((values) => {
          if (options.all) {
            callback(
              null,
              values.map((address) => {
                return { address, family: 4 };
              })
            );
          } else callback(null, values[0]!, 4);
        })
        .catch((error: Error) => callback(error, "", 4));
    }
  }
});
let preferAlternateUntil = 0;
const ROUTE_ERRORS = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN"
]);

export async function fetchFreehire(url: string, init: RequestInit): Promise<Response> {
  if (new URL(url).hostname !== "freehire.me") return fetch(url, init);
  const first = Date.now() < preferAlternateUntil ? alternate : primary;
  try {
    return await fetch(url, { ...init, dispatcher: first } as RequestInit & { dispatcher: Agent });
  } catch (error) {
    if (init.signal?.aborted || !ROUTE_ERRORS.has(freehireNetworkCode(error) ?? "")) throw error;
    const second = first === primary ? alternate : primary;
    const response = await fetch(url, { ...init, dispatcher: second } as RequestInit & {
      dispatcher: Agent;
    });
    preferAlternateUntil = second === alternate ? Date.now() + 5 * 60_000 : 0;
    return response;
  }
}
