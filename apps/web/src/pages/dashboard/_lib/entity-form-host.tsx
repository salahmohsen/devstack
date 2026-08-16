"use client";

import { useRef, useState } from "react";

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

/** Match inset Sheet `duration-200` so we unmount after exit motion. */
const SHEET_EXIT_MS = 250;

/**
 * Stay-put host: remounts the original evidence form in EntityFormSheet.
 * Completes the hub tool after save or discard, then clears the request.
 */
export function EntityFormHost() {
  const request = useEntityFormHostSelector((state) => state.request);
  if (!request) return null;
  return <EntityFormHostSession key={request.requestId} request={request} />;
}

function EntityFormHostSession({ request }: { request: EntityFormHostRequest }) {
  const { addToolOutput } = useHubChat();
  const [open, setOpen] = useState(true);
  const savedIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);

  const complete = (output: OpenEntityFormOutput) => {
    if (completedRef.current) return;
    completedRef.current = true;
    void addToolOutput({
      tool: request.toolName,
      toolCallId: request.toolCallId,
      output
    });
    window.setTimeout(() => {
      clearEntityFormRequest(request.requestId);
    }, SHEET_EXIT_MS);
  };

  const initialData = request.id ? { id: request.id } : null;

  const handleSaved = (id: string) => {
    savedIdRef.current = id;
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    setOpen(false);
    const savedId = savedIdRef.current;
    if (savedId) {
      complete({
        ok: true,
        kind: request.kind,
        id: savedId,
        saved: true
      });
      return;
    }
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
        open={open}
        initialData={initialData}
        onOpenChange={handleOpenChange}
        onSaved={handleSaved}
      />
    );
  }

  if (request.kind === "stack") {
    return (
      <StackForm
        open={open}
        initialData={initialData}
        onOpenChange={handleOpenChange}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <ExperienceForm
      open={open}
      initialData={initialData}
      onOpenChange={handleOpenChange}
      onSaved={handleSaved}
    />
  );
}
