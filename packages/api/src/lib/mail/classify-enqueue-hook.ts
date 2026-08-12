type EnqueueFn = (input: { messageId: string; userId: string }) => Promise<boolean>;

/**
 * Module-level + globalThis so Vite SSR dual instances of this file
 * (`@tsu-stack/api/...` vs package `#@/...`) share one registration.
 */
const HOOK_KEY = Symbol.for("tsu-stack.mailClassifyEnqueue");

type HookStore = { enqueueHook: EnqueueFn | null };

function store(): HookStore {
  const g = globalThis as typeof globalThis & { [HOOK_KEY]?: HookStore };
  g[HOOK_KEY] ??= { enqueueHook: null };
  return g[HOOK_KEY]!;
}

/** Server registers BullMQ producer at boot so API handlers can enqueue classify. */
export function registerMailClassifyEnqueue(fn: EnqueueFn): void {
  store().enqueueHook = fn;
}

export async function requestMailClassify(input: {
  messageId: string;
  userId: string;
}): Promise<boolean> {
  const hook = store().enqueueHook;
  if (!hook) return false;
  return hook(input);
}
