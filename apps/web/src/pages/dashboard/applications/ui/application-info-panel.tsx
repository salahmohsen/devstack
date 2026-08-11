"use client";

import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCE_TAG_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  HIRING_URGENCY_LABELS,
  type ApplicationOutput,
  type ApplicationSourceTag
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
  ApplicationActivitySection,
  ApplicationMatchScoreBadge,
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

function displayText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  return trimmed;
}

function postingHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Label left, value right — values share one foreground color. */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="shrink-0 pt-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-foreground">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
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
  const resumeLabel = linkedResume?.filename ?? (item.resumeId ? "Linked resume" : null);

  const hasMaterials = Boolean(
    item.resumeId ?? item.coverLetterR2Key ?? item.coverLetterBody ?? item.outreachBody
  );

  return (
    <>
      <ItemInfoPanel
        title={item.title}
        description={
          <FrameDescription className="flex flex-col gap-2">
            <span className="text-base font-medium text-foreground">{item.companyName}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <ApplicationStageBadge stage={item.stage} />
              <ApplicationStatusBadge outcome={item.outcome} />
              {item.matchScore != null ? (
                <ApplicationMatchScoreBadge matchScore={item.matchScore} />
              ) : null}
              {item.employmentType !== "unknown" ? (
                <Badge variant="outline">{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</Badge>
              ) : null}
              {item.hiringUrgency !== "unknown" ? (
                <Badge variant="outline">{HIRING_URGENCY_LABELS[item.hiringUrgency]}</Badge>
              ) : null}
              {(item.sourceTags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] font-medium">
                  {tag in APPLICATION_SOURCE_TAG_LABELS
                    ? APPLICATION_SOURCE_TAG_LABELS[tag as ApplicationSourceTag]
                    : tag}
                </Badge>
              ))}
            </span>
          </FrameDescription>
        }
        updatedAt={item.updatedAt}
        createdAt={item.createdAt}
      >
        <div className="space-y-5">
          <ApplyPackagePanelActions app={item} />

          {item.agentTake?.trim() ? (
            <Section title="Agent's take">
              <p className="text-sm leading-relaxed text-muted-foreground">{item.agentTake}</p>
            </Section>
          ) : null}

          {hasMaterials ? (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
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

          <dl className="space-y-2.5">
            <MetaRow label="Employment type">{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</MetaRow>
            <MetaRow label="Location">{displayText(item.location)}</MetaRow>
            <MetaRow label="Salary">{displayText(item.salaryRange)}</MetaRow>
            <MetaRow label="Source">{sourceLabel ?? "—"}</MetaRow>
            <MetaRow label="Posting URL">
              {item.url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 max-w-full gap-1.5 px-2 text-foreground hover:text-foreground"
                  render={
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open job posting (${postingHost(item.url)})`}
                    />
                  }
                >
                  <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{postingHost(item.url)}</span>
                </Button>
              ) : (
                "—"
              )}
            </MetaRow>
            {!hasMaterials ? (
              <MetaRow label="Resume">
                {item.resumeId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 max-w-full gap-1.5 px-2 text-foreground hover:text-foreground"
                    onClick={() => setResumePreviewOpen(true)}
                  >
                    <FileTextIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{resumeLabel ?? "Preview"}</span>
                  </Button>
                ) : (
                  "—"
                )}
              </MetaRow>
            ) : null}
            <MetaRow label="Stage changed">{formatWhen(item.stageChangedAt)}</MetaRow>
            <MetaRow label="Closed">
              {item.outcomeAt ? formatWhen(item.outcomeAt) : item.outcome ? "—" : "Open"}
            </MetaRow>
          </dl>

          <Section title="Job description">
            {item.description?.trim() ? (
              <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {item.description}
              </Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No job description.</p>
            )}
          </Section>

          {item.notes?.trim() ? (
            <Section title="Legacy notes">
              <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {item.notes}
              </Markdown>
            </Section>
          ) : null}

          <ApplicationActivitySection applicationId={item.id} />
        </div>
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
