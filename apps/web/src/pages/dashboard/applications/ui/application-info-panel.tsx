"use client";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STAGE_LABELS,
  HIRING_URGENCY_LABELS,
  type ApplicationOutput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";

import { Markdown } from "@/shared/ui/markdown";

import { ItemInfoPanel } from "@/widgets/items-page";

function formatWhen(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

type ApplicationInfoPanelProps = {
  item: ApplicationOutput;
};

export function ApplicationInfoPanel({ item }: ApplicationInfoPanelProps) {
  const sourceLabel =
    item.source && item.source in APPLICATION_SOURCE_LABELS
      ? APPLICATION_SOURCE_LABELS[item.source as keyof typeof APPLICATION_SOURCE_LABELS]
      : null;

  return (
    <ItemInfoPanel
      title={item.title}
      description={`${item.companyName}${sourceLabel ? ` · ${sourceLabel}` : ""}`}
      updatedAt={item.updatedAt}
      createdAt={item.createdAt}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">{APPLICATION_STAGE_LABELS[item.stage]}</Badge>
        {item.outcome ? (
          <Badge variant="secondary">{APPLICATION_OUTCOME_LABELS[item.outcome]}</Badge>
        ) : (
          <Badge variant="secondary">Open</Badge>
        )}
        {item.hiringUrgency !== "unknown" ? (
          <Badge variant="outline">{HIRING_URGENCY_LABELS[item.hiringUrgency]}</Badge>
        ) : null}
      </div>

      <dl className="mb-4 space-y-2 text-sm">
        {item.location ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Location
            </dt>
            <dd>{item.location}</dd>
          </div>
        ) : null}
        {item.salaryRange ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Salary
            </dt>
            <dd>{item.salaryRange}</dd>
          </div>
        ) : null}
        {item.url ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Posting URL
            </dt>
            <dd>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-primary underline-offset-2 hover:underline"
              >
                {item.url}
              </a>
            </dd>
          </div>
        ) : null}
        {sourceLabel ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Source
            </dt>
            <dd>{sourceLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Stage changed
          </dt>
          <dd>{formatWhen(item.stageChangedAt)}</dd>
        </div>
        {item.outcomeAt ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Closed
            </dt>
            <dd>{formatWhen(item.outcomeAt)}</dd>
          </div>
        ) : null}
        {item.resumeId ? (
          <div>
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Resume
            </dt>
            <dd className="text-muted-foreground">Linked resume on file</dd>
          </div>
        ) : null}
      </dl>

      {item.description ? (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Job description
          </p>
          <Markdown className="prose prose-sm mb-4 max-w-none text-foreground dark:prose-invert">
            {item.description}
          </Markdown>
        </>
      ) : null}

      {item.notes ? (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Notes
          </p>
          <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            {item.notes}
          </Markdown>
        </>
      ) : (
        !item.description && <p className="text-muted-foreground">No description or notes.</p>
      )}
    </ItemInfoPanel>
  );
}
