import { type EvidenceKind } from "#@/evidence/propose";

export type EvidenceGoal = {
  id: string;
  column: string;
  required: boolean;
  /** Spoken in chat so the seeker knows why the pipeline asks. Not a form label. */
  pipelineRole: string;
};

export const EVIDENCE_GOALS = {
  project: [
    {
      id: "title",
      column: "title",
      required: true,
      pipelineRole: 'Identity on the public profile, brief "who I am," and match evidence titles.'
    },
    {
      id: "summary",
      column: "summary",
      required: true,
      pipelineRole: "Short signal for job-preference match and the brief skills/who paragraph."
    },
    {
      id: "year",
      column: "year",
      required: true,
      pipelineRole: 'Timeline order; "latest project" and inspect chronology.'
    },
    {
      id: "description",
      column: "description",
      required: false,
      pipelineRole: "Longer body for inspect / public page; not required to score."
    },
    {
      id: "repos",
      column: "repos",
      required: false,
      pipelineRole: "Open-repo / demo; detect stacks can fill later."
    },
    {
      id: "demoUrl",
      column: "demoUrl",
      required: false,
      pipelineRole: "Open-repo / demo; detect stacks can fill later."
    },
    {
      id: "includedInPortfolio",
      column: "includedInPortfolio",
      required: false,
      pipelineRole: "Whether the public profile shows this row. Ask once."
    }
  ],
  experience: [
    {
      id: "title",
      column: "title",
      required: true,
      pipelineRole: "Role name for brief, match, and public timeline."
    },
    {
      id: "organization",
      column: "organization",
      required: true,
      pipelineRole: 'Employer identity; "companies I worked at."'
    },
    {
      id: "description",
      column: "description",
      required: true,
      pipelineRole: "What you did — brief who-paragraph and match evidence."
    },
    {
      id: "fromDate",
      column: "fromDate",
      required: false,
      pipelineRole: "Timeline; ask once."
    },
    {
      id: "toDate",
      column: "toDate",
      required: false,
      pipelineRole: "Timeline end; current role."
    },
    {
      id: "isPresent",
      column: "isPresent",
      required: false,
      pipelineRole: "Timeline end; current role."
    },
    {
      id: "includedInPortfolio",
      column: "includedInPortfolio",
      required: false,
      pipelineRole: "Public timeline inclusion. Ask once."
    }
  ],
  stack: [
    {
      id: "name",
      column: "name",
      required: true,
      pipelineRole: 'Catalog key; brief skills list; match "tools I use."'
    },
    {
      id: "type",
      column: "type",
      required: false,
      pipelineRole: "Organize / family; detect often fills this."
    },
    {
      id: "description",
      column: "description",
      required: false,
      pipelineRole: "Inspect copy."
    },
    {
      id: "isFeatured",
      column: "isFeatured",
      required: false,
      pipelineRole: "Public Skills row vs full catalog. Ask once."
    },
    {
      id: "includedInPortfolio",
      column: "includedInPortfolio",
      required: false,
      pipelineRole: "Public Skills row vs full catalog. Ask once."
    }
  ]
} as const satisfies Record<EvidenceKind, readonly EvidenceGoal[]>;

export function valuePresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function missingRequiredEvidenceGoals(
  kind: EvidenceKind,
  record: Record<string, unknown>
): string[] {
  return EVIDENCE_GOALS[kind]
    .filter((goal) => goal.required && !valuePresent(record[goal.column]))
    .map((goal) => goal.id);
}

export function evidenceGoalsReady(kind: EvidenceKind, record: Record<string, unknown>): boolean {
  return missingRequiredEvidenceGoals(kind, record).length === 0;
}
