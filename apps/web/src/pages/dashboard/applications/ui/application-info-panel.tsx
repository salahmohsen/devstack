"use client";

import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_SOURCE_LABELS,
  HIRING_URGENCY_LABELS,
  type ApplicationOutput
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FrameDescription } from "@tsu-stack/ui/components/frame";

import { Markdown } from "@/shared/ui/markdown";

import {
  ApplicationStageBadge,
  ApplicationStatusBadge,
  coverLetterDownloadUrl,
  resumeDownloadUrl
} from "@/features/applications";

import { ItemInfoPanel } from "@/widgets/items-page";

import { ApplyPackagePanelActions } from "@/pages/dashboard/applications/ui/apply-package-entry-actions";

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

/** Label left, value right — values share one foreground color. */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-foreground">{children}</dd>
    </div>
  );
}

type ApplicationInfoPanelProps = {
  item: ApplicationOutput;
};

export function ApplicationInfoPanel({ item }: ApplicationInfoPanelProps) {
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false);

  const sourceLabel =
    item.source && item.source in APPLICATION_SOURCE_LABELS
      ? APPLICATION_SOURCE_LABELS[item.source as keyof typeof APPLICATION_SOURCE_LABELS]
      : null;

  const resumesQuery = useQuery({
    ...orpcQueryClient.resume.list.queryOptions(),
    enabled: Boolean(item.resumeId)
  });
  const linkedResume = item.resumeId
    ? resumesQuery.data?.find((r) => r.id === item.resumeId)
    : undefined;

  const hasMaterials = Boolean(
    item.resumeId ?? item.coverLetterR2Key ?? item.coverLetterBody ?? item.outreachBody
  );

  return (
    <>
      <ItemInfoPanel
        title={item.title}
        description={
          <FrameDescription className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              {item.companyName}
              {sourceLabel ? ` · ${sourceLabel}` : ""}
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <ApplicationStageBadge stage={item.stage} />
              <ApplicationStatusBadge outcome={item.outcome} />
            </span>
          </FrameDescription>
        }
        updatedAt={item.updatedAt}
        createdAt={item.createdAt}
      >
        {item.hiringUrgency !== "unknown" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline">{HIRING_URGENCY_LABELS[item.hiringUrgency]}</Badge>
          </div>
        ) : null}

        <ApplyPackagePanelActions app={item} className="mb-4" />

        {hasMaterials ? (
          <div className="mb-4 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Materials
            </p>
            <dl className="space-y-2.5">
              {item.resumeId ? (
                <MetaRow label="Resume">
                  <span className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-foreground hover:text-foreground"
                      onClick={() => setResumePreviewOpen(true)}
                    >
                      <FileTextIcon className="size-3.5" aria-hidden />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-foreground hover:text-foreground"
                      render={
                        <a
                          href={resumeDownloadUrl(item.resumeId)}
                          download
                          aria-label="Download resume PDF"
                        >
                          Download
                        </a>
                      }
                    >
                      <DownloadIcon className="size-3.5" aria-hidden />
                    </Button>
                  </span>
                </MetaRow>
              ) : null}
              {item.coverLetterR2Key ? (
                <MetaRow label="Cover letter">
                  <span className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-foreground hover:text-foreground"
                      render={
                        <a
                          href={coverLetterDownloadUrl(item.id, true)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Preview cover letter PDF"
                        >
                          Preview
                        </a>
                      }
                    >
                      <FileTextIcon className="size-3.5" aria-hidden />
                      Preview
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-foreground hover:text-foreground"
                      render={
                        <a
                          href={coverLetterDownloadUrl(item.id)}
                          download
                          aria-label="Download cover letter PDF"
                        >
                          Download
                        </a>
                      }
                    >
                      <DownloadIcon className="size-3.5" aria-hidden />
                    </Button>
                  </span>
                </MetaRow>
              ) : null}
              {item.recruiterEmail ? (
                <MetaRow label="Recruiter">{item.recruiterEmail}</MetaRow>
              ) : null}
              {item.outreachSentAt ? (
                <MetaRow label="Outreach sent">{formatWhen(item.outreachSentAt)}</MetaRow>
              ) : null}
            </dl>
          </div>
        ) : null}

        <dl className="mb-4 space-y-2.5">
          {item.location ? <MetaRow label="Location">{item.location}</MetaRow> : null}
          {item.salaryRange ? <MetaRow label="Salary">{item.salaryRange}</MetaRow> : null}
          {item.url ? (
            <MetaRow label="Posting URL">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-foreground hover:text-foreground"
                render={
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open job posting"
                  />
                }
              >
                <ExternalLinkIcon className="size-4" aria-hidden />
              </Button>
            </MetaRow>
          ) : null}
          {sourceLabel ? <MetaRow label="Source">{sourceLabel}</MetaRow> : null}
          <MetaRow label="Stage changed">{formatWhen(item.stageChangedAt)}</MetaRow>
          {item.outcomeAt ? <MetaRow label="Closed">{formatWhen(item.outcomeAt)}</MetaRow> : null}
          {item.resumeId && !hasMaterials ? (
            <MetaRow label="Resume">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-foreground hover:text-foreground"
                onClick={() => setResumePreviewOpen(true)}
              >
                <FileTextIcon className="size-3.5" aria-hidden />
                Preview
              </Button>
            </MetaRow>
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

      {item.resumeId ? (
        <Dialog open={resumePreviewOpen} onOpenChange={setResumePreviewOpen}>
          <DialogPopup
            className="flex h-[min(90dvh,56rem)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
            bottomStickOnMobile={false}
          >
            <DialogHeader className="shrink-0 border-b px-5 py-4">
              <DialogTitle className="truncate pe-8">
                {linkedResume?.filename ?? "Resume preview"}
              </DialogTitle>
              {linkedResume?.author ? (
                <DialogDescription>Author: {linkedResume.author}</DialogDescription>
              ) : (
                <DialogDescription>Linked resume PDF</DialogDescription>
              )}
            </DialogHeader>
            <div className="min-h-0 flex-1 bg-muted/30">
              <embed
                src={resumeDownloadUrl(item.resumeId, true)}
                type="application/pdf"
                className="h-full min-h-0 w-full"
                title={linkedResume?.filename ?? "Resume PDF"}
              />
            </div>
          </DialogPopup>
        </Dialog>
      ) : null}
    </>
  );
}
