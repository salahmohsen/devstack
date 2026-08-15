"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlignLeftIcon,
  BriefcaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  PackageIcon,
  RefreshCwIcon,
  SparklesIcon,
  StickyNoteIcon
} from "lucide-react";
import { useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCE_TAG_LABELS,
  assessAgentTakeReadiness,
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

import { Markdown } from "@/shared/ui/markdown";
import { isEmptyRichHtml, RichHtml } from "@/shared/ui/rich-html";

import {
  ApplicationActivitySection,
  ApplicationMatchScoreBadge,
  ApplicationStageBadge,
  ApplicationStatusBadge,
  coverLetterDownloadUrl,
  resumeDownloadUrl,
  useRegenerateAgentTakeMutation
} from "@/features/applications";

import { ItemInfoPanel, ItemInfoSection, PanelEditButton } from "@/widgets/items-page";

import { ApplyPackagePanelActions } from "@/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions";

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

/** Harvested JDs are often HTML (`<p>`, `<ul>`); user pastes may be Markdown. */
function looksLikeJobDescriptionHtml(value: string): boolean {
  return /<(?:p|br|div|ul|ol|li|h[1-6]|span|strong|em|b|i|a|section|article|blockquote)\b/i.test(
    value
  );
}

/** Some adapters persist tags as `&lt;p&gt;`. Decode before detect/render. */
function decodeJobDescriptionEntities(value: string): string {
  if (!/&(?:lt|gt|amp|quot|#39|#x27);/i.test(value)) return value;
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function JobDescriptionBody({ value }: { value: string }) {
  const html = decodeJobDescriptionEntities(value);
  if (looksLikeJobDescriptionHtml(html)) {
    return (
      <RichHtml
        html={html}
        className="max-w-none text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold"
      />
    );
  }
  return (
    <Markdown
      allowRawHtml={false}
      className="prose prose-sm max-w-none text-foreground dark:prose-invert"
    >
      {value}
    </Markdown>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="shrink-0 pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-foreground">{children}</dd>
    </div>
  );
}

type ApplicationInfoPanelProps = {
  item: ApplicationOutput;
  /**
   * `tracked` (default): full CRM panel with package actions and stage.
   * `discovery`: New jobs inbox/dismissed — hide package/stage chrome; keep
   * description, take, meta, activity + notes.
   */
  variant?: "tracked" | "discovery";
  onEdit?: () => void;
};

export function ApplicationInfoPanel({
  item,
  variant = "tracked",
  onEdit
}: ApplicationInfoPanelProps) {
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false);
  const regenerateTake = useRegenerateAgentTakeMutation();
  const isDiscovery = variant === "discovery";

  const customSourceLabel = item.sourceLabel?.trim();
  const enumSourceLabel =
    item.source != null && item.source in APPLICATION_SOURCE_LABELS
      ? APPLICATION_SOURCE_LABELS[item.source as keyof typeof APPLICATION_SOURCE_LABELS]
      : null;
  const sourceDisplay =
    customSourceLabel && customSourceLabel.length > 0 ? customSourceLabel : enumSourceLabel;

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
  const takeReady = assessAgentTakeReadiness(item);

  return (
    <>
      <ItemInfoPanel
        eyebrow={<BriefcaseIcon strokeWidth={1.75} />}
        title={item.title}
        description={
          <div className="space-y-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{item.companyName}</span>
              {item.location?.trim() ? (
                <>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span>{item.location}</span>
                </>
              ) : null}
              {!isDiscovery && item.employmentType !== "unknown" ? (
                <>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span>{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</span>
                </>
              ) : null}
              {item.listingClosed ? (
                <Badge
                  variant="secondary"
                  size="sm"
                  className="font-normal tracking-normal text-muted-foreground normal-case"
                  title="This posting is no longer on the board."
                >
                  Listing closed
                </Badge>
              ) : null}
            </p>
            {item.listingClosed ? (
              <p className="text-sm text-muted-foreground">
                This posting is no longer on the board.
              </p>
            ) : null}
            {(item.sourceTags ?? []).length > 0 ? (
              <span className="flex flex-wrap items-center gap-1.5">
                {(item.sourceTags ?? []).map((tag) => (
                  <Badge key={tag} variant="secondary" size="sm">
                    {tag in APPLICATION_SOURCE_TAG_LABELS
                      ? APPLICATION_SOURCE_TAG_LABELS[tag as ApplicationSourceTag]
                      : tag}
                  </Badge>
                ))}
              </span>
            ) : null}
          </div>
        }
        actions={
          <>
            {onEdit ? <PanelEditButton onClick={onEdit} /> : null}
            {!isDiscovery ? <ApplicationStageBadge stage={item.stage} /> : null}
            {!isDiscovery ? <ApplicationStatusBadge outcome={item.outcome} /> : null}
            {item.matchScore != null ? (
              <ApplicationMatchScoreBadge matchScore={item.matchScore} />
            ) : null}
            {!isDiscovery && item.hiringUrgency !== "unknown" ? (
              <Badge variant="outline">{HIRING_URGENCY_LABELS[item.hiringUrgency]}</Badge>
            ) : null}
            {item.url ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                render={
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open job posting (${postingHost(item.url)})`}
                  />
                }
              >
                <ExternalLinkIcon strokeWidth={2} />
              </Button>
            ) : null}
          </>
        }
        updatedAt={item.updatedAt}
        createdAt={item.createdAt}
      >
        <div className="space-y-8">
          {!isDiscovery ? (
            <ItemInfoSection title="Apply package" icon={<PackageIcon />}>
              <ApplyPackagePanelActions app={item} />
            </ItemInfoSection>
          ) : null}

          <ItemInfoSection title="Agent's take" icon={<SparklesIcon />}>
            {takeReady.ok && item.agentTake?.trim() ? (
              <p className="text-foreground">{item.agentTake}</p>
            ) : (
              <p className="italic">
                {takeReady.ok
                  ? "No agent take yet."
                  : "Agent take stays off until this listing has enough detail."}
              </p>
            )}
            {!takeReady.ok ? (
              <p className="mt-2 text-sm text-muted-foreground">{takeReady.message}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={!takeReady.ok}
              loading={regenerateTake.isPending}
              onClick={() => {
                if (!takeReady.ok) return;
                void regenerateTake.mutateAsync({
                  id: item.id,
                  title: item.title,
                  companyName: item.companyName,
                  trackingStatus: item.trackingStatus
                });
              }}
            >
              <RefreshCwIcon className="size-3.5" aria-hidden />
              {item.agentTake?.trim() ? "Regenerate" : "Generate take"}
            </Button>
          </ItemInfoSection>

          {!isDiscovery && hasMaterials ? (
            <ItemInfoSection title="Materials" icon={<FileTextIcon />}>
              <dl className="space-y-2.5">
                {item.resumeId ? (
                  <DetailRow label="Resume">
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
                  </DetailRow>
                ) : null}
                {item.coverLetterR2Key ? (
                  <DetailRow label="Cover letter">
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
                  </DetailRow>
                ) : null}
                {item.recruiterEmail ? (
                  <DetailRow label="Recruiter">{item.recruiterEmail}</DetailRow>
                ) : null}
                {item.outreachSentAt ? (
                  <DetailRow label="Outreach sent">{formatWhen(item.outreachSentAt)}</DetailRow>
                ) : null}
              </dl>
            </ItemInfoSection>
          ) : null}

          <ItemInfoSection title="Details" icon={<InfoIcon />}>
            <dl className="space-y-2.5">
              <DetailRow label="Employment">
                {EMPLOYMENT_TYPE_LABELS[item.employmentType]}
              </DetailRow>
              <DetailRow label="Location">{displayText(item.location)}</DetailRow>
              <DetailRow label="Salary">{displayText(item.salaryRange)}</DetailRow>
              <DetailRow label="Source">{sourceDisplay ?? "—"}</DetailRow>
              <DetailRow label="Posting">
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
              </DetailRow>
              {!hasMaterials ? (
                <DetailRow label="Resume">
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
                </DetailRow>
              ) : null}
              {!isDiscovery ? (
                <>
                  <DetailRow label="Stage changed">{formatWhen(item.stageChangedAt)}</DetailRow>
                  <DetailRow label="Closed">
                    {item.outcomeAt ? formatWhen(item.outcomeAt) : item.outcome ? "—" : "Open"}
                  </DetailRow>
                </>
              ) : null}
            </dl>
          </ItemInfoSection>

          <ItemInfoSection title="Job description" icon={<AlignLeftIcon />}>
            {item.description?.trim() && !isEmptyRichHtml(item.description) ? (
              <JobDescriptionBody value={item.description} />
            ) : (
              <p>No job description.</p>
            )}
          </ItemInfoSection>

          {item.notes?.trim() ? (
            <ItemInfoSection title="Notes" icon={<StickyNoteIcon />}>
              <Markdown
                allowRawHtml={false}
                className="prose prose-sm max-w-none text-foreground dark:prose-invert"
              >
                {item.notes}
              </Markdown>
            </ItemInfoSection>
          ) : null}

          <ItemInfoSection title="Activity" icon={<HistoryIcon />}>
            <ApplicationActivitySection applicationId={item.id} hideHeading />
          </ItemInfoSection>
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
