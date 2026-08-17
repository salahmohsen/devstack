"use client";

import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  presentAiError,
  type AiErrorFeature,
  type AiErrorSeverity
} from "@/shared/lib/parse-ai-error";

export type ToastAiErrorOptions = {
  feature?: AiErrorFeature;
  severity?: AiErrorSeverity;
  notes?: string[];
  /**
   * Optional in-app link shown as toast action.
   * Prefer linking to the recovery surface (settings, review dialog) over dumping the error body.
   */
  action?: {
    label: string;
    to: string;
    onClick?: () => void;
  };
  duration?: number;
};

/**
 * Consistent AI error / partial-success toasts.
 *
 * Toast = short acknowledgment only. Persistent recovery belongs in AiErrorBanner
 * on the originating surface. Never put multi-line notes in the toast body.
 */
export function toastAiError(
  message: string | null | undefined,
  options: ToastAiErrorOptions = {}
) {
  const presentation = presentAiError(message, {
    feature: options.feature,
    severity: options.severity,
    notes: options.notes
  });

  const actionNode = options.action ? (
    <Link to={options.action.to} data-button onClick={options.action.onClick}>
      {options.action.label}
    </Link>
  ) : presentation.showAiSettings ? (
    <Link to="/dashboard/settings/ai" data-button>
      AI settings
    </Link>
  ) : presentation.billingUrl ? (
    <a href={presentation.billingUrl} target="_blank" rel="noopener noreferrer" data-button>
      {presentation.externalActionLabel ?? "Open link"}
    </a>
  ) : undefined;

  const duration = options.duration ?? (options.severity === "partial" ? 12_000 : 10_000);

  if (presentation.variant === "warning" || options.severity === "partial") {
    toast.warning(presentation.title, {
      description: presentation.description,
      action: actionNode,
      duration
    });
    return presentation;
  }

  toast.error(presentation.title, {
    description: presentation.description,
    action: actionNode,
    duration
  });
  return presentation;
}
