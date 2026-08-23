export type JobInspectFrame = { type: "job-inspect"; applicationId: string };
export type StackCreateFrame = {
  type: "stack-create";
  name: string;
  returnTo: JobInspectFrame;
};
export type SidePanelFrame = JobInspectFrame | StackCreateFrame;

let stack: SidePanelFrame[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function pushSidePanelFrame(frame: SidePanelFrame): void {
  stack = [...stack, frame];
  emit();
}

export function popSidePanelFrame(): SidePanelFrame | null {
  if (stack.length === 0) return null;
  const top = stack[stack.length - 1]!;
  stack = stack.slice(0, -1);
  emit();
  return top;
}

export function peekSidePanelFrame(): SidePanelFrame | null {
  return stack[stack.length - 1] ?? null;
}

export function subscribeSidePanelStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetSidePanelStackForTests() {
  stack = [];
  emit();
}
