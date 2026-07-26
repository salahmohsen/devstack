/**
 * Module-level abort + generation controller for AI work that must survive
 * route unmounts. Cancel only on explicit user action — never on unmount.
 *
 * Pattern used by organize-stacks and onboarding resume extract.
 */
export function createDetachedJobController(options: {
  /** Cancel remote Mastra run when local abort fires */
  cancelRemoteRun: (runId: string | null) => void;
}) {
  let abortController: AbortController | null = null;
  let generation = 0;

  function isCurrent(gen: number) {
    return gen === generation;
  }

  /**
   * Begin a new job generation. Does not abort a previous run — callers
   * should single-flight (no-op if already running) or cancel first.
   */
  function begin(): { generation: number; controller: AbortController; signal: AbortSignal } {
    generation += 1;
    const controller = new AbortController();
    abortController = controller;
    return { generation, controller, signal: controller.signal };
  }

  /** Explicit cancel — bumps generation so in-flight handlers ignore results. */
  function cancel(runId: string | null) {
    options.cancelRemoteRun(runId);
    abortController?.abort();
    abortController = null;
    generation += 1;
  }

  function clearIf(controller: AbortController) {
    if (abortController === controller) {
      abortController = null;
    }
  }

  function getAbortController() {
    return abortController;
  }

  function getGeneration() {
    return generation;
  }

  return {
    begin,
    cancel,
    clearIf,
    isCurrent,
    getAbortController,
    getGeneration
  };
}

export type DetachedJobController = ReturnType<typeof createDetachedJobController>;

/** Shared job lifecycle statuses for AI features. */
export type AiJobStatus = "idle" | "running" | "ready" | "failed" | "canceled";
