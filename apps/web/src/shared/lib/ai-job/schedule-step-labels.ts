import { type DetachedJobController } from "@/shared/lib/ai-job/create-detached-job";

export type AiJobStepSchedule = ReadonlyArray<{ at: number; label: string }>;

/**
 * Fake progress labels while a single RPC/stream runs (no server step events).
 * Clears previous timers into `timers` and only applies labels for the current generation.
 */
export function scheduleStepLabels(options: {
  generation: number;
  controller: DetachedJobController;
  schedule: AiJobStepSchedule;
  timers: number[];
  setStepLabel: (label: string) => void;
}): void {
  const { generation, controller, schedule, timers, setStepLabel } = options;
  for (const id of timers) window.clearTimeout(id);
  timers.length = 0;

  for (const step of schedule) {
    if (step.at === 0) {
      if (controller.isCurrent(generation)) setStepLabel(step.label);
      continue;
    }
    timers.push(
      window.setTimeout(() => {
        if (!controller.isCurrent(generation)) return;
        setStepLabel(step.label);
      }, step.at)
    );
  }
}

export function clearStepTimers(timers: number[]): void {
  for (const id of timers) window.clearTimeout(id);
  timers.length = 0;
}
