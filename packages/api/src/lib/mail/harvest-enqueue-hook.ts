type EnqueueFn = (input: {
  messageId: string;
  userId: string;
  /** When true, always enqueue a new BullMQ job (manual re-scan). */
  force?: boolean;
}) => Promise<boolean>;

let enqueueHook: EnqueueFn | null = null;

/** Server registers BullMQ producer at boot so API handlers can enqueue harvest. */
export function registerMailJobHarvestEnqueue(fn: EnqueueFn): void {
  enqueueHook = fn;
}

export async function requestMailJobHarvest(input: {
  messageId: string;
  userId: string;
  force?: boolean;
}): Promise<boolean> {
  if (!enqueueHook) return false;
  return enqueueHook(input);
}
