"use client";

import { useRef } from "react";

import {
  clearEntityFormRequest,
  useEntityFormHostSelector,
  useHubChat,
  type EntityFormHostRequest,
  type OpenEntityFormOutput
} from "@/features/agent-hub";

import { ExperienceForm } from "@/pages/dashboard/experiences/experience-form";
import { ProjectForm } from "@/pages/dashboard/projects/ui/project-form";
import { StackForm } from "@/pages/dashboard/stacks/ui/stack-form";

/**
 * Stay-put host: remounts the original evidence form in EntityFormSheet.
 * Completes the hub tool after save or discard.
 */
export function EntityFormHost() {
  const request = useEntityFormHostSelector((state) => state.request);
  if (!request) return null;
  return <EntityFormHostSession key={request.requestId} request={request} />;
}

function EntityFormHostSession({ request }: { request: EntityFormHostRequest }) {
  const { addToolOutput } = useHubChat();
  const completedRef = useRef(false);

  const complete = (output: OpenEntityFormOutput) => {
    if (completedRef.current) return;
    completedRef.current = true;
    void addToolOutput({
      tool: request.toolName,
      toolCallId: request.toolCallId,
      output
    });
    clearEntityFormRequest(request.requestId);
  };

  const initialData = request.id ? { id: request.id } : null;

  const handleSaved = (id: string) => {
    complete({
      ok: true,
      kind: request.kind,
      id,
      saved: true
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    complete({
      ok: true,
      kind: request.kind,
      ...(request.id ? { id: request.id } : {}),
      saved: false,
      cancelled: true
    });
  };

  if (request.kind === "project") {
    return (
      <ProjectForm
        open
        initialData={initialData}
        onOpenChange={handleOpenChange}
        onSaved={handleSaved}
      />
    );
  }

  if (request.kind === "stack") {
    return (
      <StackForm
        open
        initialData={initialData}
        onOpenChange={handleOpenChange}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <ExperienceForm
      open
      initialData={initialData}
      onOpenChange={handleOpenChange}
      onSaved={handleSaved}
    />
  );
}
