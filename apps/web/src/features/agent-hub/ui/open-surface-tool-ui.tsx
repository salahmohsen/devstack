"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  isOpenSurfaceToolName,
  parseOpenSurfaceHref
} from "@/features/agent-hub/lib/hub-tool-names";

const OPEN_SURFACE_TOOL_ID = "open-surface";

type OpenSurfaceArgs = { href?: string };
type OpenSurfaceResult = {
  ok: boolean;
  href?: string;
  code?: string;
  message?: string;
};

function isDashboardHref(href: string): boolean {
  return href === "/dashboard" || href.startsWith("/dashboard/");
}

/**
 * Client complete for openSurface: navigate under /dashboard then addToolOutput.
 */
export function OpenSurfaceToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<OpenSurfaceArgs, OpenSurfaceResult>) {
  const navigate = useNavigate();
  const { addToolOutput } = useHubChat();
  const completedRef = React.useRef(false);

  const resolvedToolName = isOpenSurfaceToolName(toolName ?? "")
    ? (toolName as string)
    : OPEN_SURFACE_TOOL_ID;

  const complete = React.useCallback(
    (output: OpenSurfaceResult) => {
      if (typeof addResult === "function") {
        addResult(output);
      }
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (result != null) return;
    if (completedRef.current) return;
    // Wait until args are available (not still streaming)
    if (status?.type === "running") return;

    const href = parseOpenSurfaceHref(args);
    if (!href) {
      completedRef.current = true;
      complete({
        ok: false,
        code: "INVALID_HREF",
        message: "Missing or empty href"
      });
      return;
    }

    if (!isDashboardHref(href)) {
      completedRef.current = true;
      complete({
        ok: false,
        href,
        code: "INVALID_HREF",
        message: "Only /dashboard paths are allowed"
      });
      return;
    }

    completedRef.current = true;
    void navigate({ to: href as never }).then(
      () => {
        complete({ ok: true, href });
      },
      () => {
        complete({
          ok: false,
          href,
          code: "NAVIGATE_FAILED",
          message: "Navigation failed"
        });
      }
    );
  }, [args, complete, navigate, result, status?.type]);

  if (result && typeof result === "object" && "ok" in result) {
    const r = result as OpenSurfaceResult;
    if (r.ok) {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Opened <span className="font-medium text-foreground">{r.href ?? "dashboard"}</span>
        </p>
      );
    }
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-destructive">
        Could not open surface{r.message ? `: ${r.message}` : ""}
      </p>
    );
  }

  return <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">Opening…</p>;
}
