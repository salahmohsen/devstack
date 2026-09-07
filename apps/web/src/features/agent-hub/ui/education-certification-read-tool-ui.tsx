"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

import {
  parseGetEducationResult,
  parseGetCertificationResult,
  parseListEducationsResult,
  parseListCertificationsResult,
  type EducationRow,
  type CertificationRow
} from "@/features/agent-hub/lib/education-certification-results";

export function ListEducationsToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseListEducationsResult(result);
  return (
    <EducationListFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="No education entries yet."
    />
  );
}

export function GetEducationToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseGetEducationResult(result);
  return (
    <EducationListFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="That education entry was not found."
    />
  );
}

export function ListCertificationsToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseListCertificationsResult(result);
  return (
    <CertificationListFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="No certifications yet."
    />
  );
}

export function GetCertificationToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseGetCertificationResult(result);
  return (
    <CertificationListFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="That certification was not found."
    />
  );
}

function EducationListFrame({
  rows,
  pending,
  empty
}: {
  rows: EducationRow[];
  pending: boolean;
  empty: string;
}) {
  if (pending && rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading education…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex max-w-none flex-col gap-2">
      {rows.map((row) => {
        const range = row.isPresent
          ? `${row.fromDate ?? ""} — Present`.trim()
          : [row.fromDate, row.toDate].filter(Boolean).join(" — ");
        return (
          <li key={row.id} className="min-w-0 text-sm">
            <p className="truncate font-medium text-foreground">
              {row.school} — {row.degree}
              {row.field ? `, ${row.field}` : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[range, row.gpa ? `GPA ${row.gpa}` : null].filter(Boolean).join(" · ")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function CertificationListFrame({
  rows,
  pending,
  empty
}: {
  rows: CertificationRow[];
  pending: boolean;
  empty: string;
}) {
  if (pending && rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading certifications…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex max-w-none flex-col gap-2">
      {rows.map((row) => {
        const range = [row.issuedAt, row.expiresAt ? `Expires ${row.expiresAt}` : null]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={row.id} className="min-w-0 text-sm">
            <p className="truncate font-medium text-foreground">
              {row.name} — {row.issuer}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[range, row.credentialUrl].filter(Boolean).join(" · ")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
