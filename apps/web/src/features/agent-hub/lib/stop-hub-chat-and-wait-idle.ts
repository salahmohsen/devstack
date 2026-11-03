type StoppableChat = {
  readonly status: string;
  stop: () => Promise<void> | void;
};

const STREAMING_STATUSES = new Set(["submitted", "streaming"]);

/**
 * `Chat.stop()` only aborts; the stream settles on a later tick and a request
 * still in flight can write into the next thread. Resolves true once idle.
 */
export async function stopHubChatAndWaitIdle(
  chat: StoppableChat,
  { timeoutMs = 3000, pollMs = 20 }: { timeoutMs?: number; pollMs?: number } = {}
): Promise<boolean> {
  if (!STREAMING_STATUSES.has(chat.status)) return true;
  await chat.stop();
  const deadline = Date.now() + timeoutMs;
  while (STREAMING_STATUSES.has(chat.status)) {
    if (Date.now() >= deadline) return false;
    await new Promise<void>((resolve) => setTimeout(resolve, pollMs));
  }
  return true;
}
