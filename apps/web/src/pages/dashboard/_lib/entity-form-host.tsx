"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  clearEntityFormRequest,
  dismissEntityFormCalls,
  pendingOpenEntityFormIds,
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
  const { addToolOutput, messages } = useHubChat();
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

  const experienceQuery = useQuery({
    ...orpcQueryClient.experiences.get.queryOptions({ input: { id: request.id ?? "" } }),
    enabled: request.kind === "experience" && Boolean(request.id)
  });
  const projectQuery = useQuery({
    ...orpcQueryClient.projects.get.queryOptions({ input: { id: request.id ?? "" } }),
    enabled: request.kind === "project" && Boolean(request.id)
  });
  const stackQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({ input: { id: request.id ?? "" } }),
    enabled: request.kind === "stack" && Boolean(request.id)
  });

  const initialData =
    request.kind === "project"
      ? (projectQuery.data ?? (request.id ? { id: request.id } : null))
      : request.kind === "stack"
        ? (stackQuery.data ?? (request.id ? { id: request.id } : null))
        : (experienceQuery.data ?? (request.id ? { id: request.id } : null));

  const editLoading =
    Boolean(request.id) &&
    ((request.kind === "project" && projectQuery.isLoading && !projectQuery.data) ||
      (request.kind === "stack" && stackQuery.isLoading && !stackQuery.data) ||
      (request.kind === "experience" && experienceQuery.isLoading && !experienceQuery.data));

  if (editLoading) return null;

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
    if (request.completeOnClose === false) {
      window.setTimeout(() => {
        clearEntityFormRequest(request.requestId);
      }, SHEET_EXIT_MS);
      return;
    }
    if (savedId) {
      complete({
        ok: true,
        kind: request.kind,
        id: savedId,
        saved: true
      });
      return;
    }
    dismissEntityFormCalls([...pendingOpenEntityFormIds(messages), request.toolCallId]);
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
