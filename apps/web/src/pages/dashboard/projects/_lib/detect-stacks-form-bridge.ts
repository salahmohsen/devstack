import { type UpsertedDetectedStack } from "@/pages/dashboard/projects/ui/detect-stacks-dialog";

/**
 * Lets the always-mounted detect results host notify an open ProjectForm
 * so it can merge upserted stack ids into local form state.
 */
type DetectStacksFormMergeHandler = (projectId: string, stacks: UpsertedDetectedStack[]) => void;

let mergeHandler: DetectStacksFormMergeHandler | null = null;

export function setDetectStacksFormMergeHandler(handler: DetectStacksFormMergeHandler | null) {
  mergeHandler = handler;
}

export function notifyDetectStacksApplied(projectId: string, stacks: UpsertedDetectedStack[]) {
  mergeHandler?.(projectId, stacks);
}
