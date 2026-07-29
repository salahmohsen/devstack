type EnqueueFn = (input: { messageId: string; userId: string }) => Promise<boolean>;

let enqueueHook: EnqueueFn | null = null;

/** Server registers BullMQ producer at boot so API handlers can enqueue classify. */
export function registerMailClassifyEnqueue(fn: EnqueueFn): void {
  enqueueHook = fn;
}

export async function requestMailClassify(input: {
  messageId: string;
  userId: string;
}): Promise<boolean> {
  if (!enqueueHook) return false;
  return enqueueHook(input);
}
