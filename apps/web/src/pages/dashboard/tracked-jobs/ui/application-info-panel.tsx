"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlignLeftIcon,
  Building2Icon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  RefreshCwIcon,
  SparklesIcon,
  StickyNoteIcon
} from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  APPLICATION_APPLY_METHOD_LABELS,
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCE_TAG_LABELS,
  assessAgentTakeReadiness,
  EMPLOYMENT_TYPE_LABELS,
  HIRING_URGENCY_LABELS,
  WORK_MODE_LABELS,
  type ApplicationOutput,
  type ApplicationSourceTag,
  type JobSkillTag
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
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { TruncatedText } from "@tsu-stack/ui/components/truncated-text";

import { ITEM_AVATAR_EYEBROW_CLASSNAME, ItemAvatar } from "@/shared/ui/item-avatar";
import { Markdown } from "@/shared/ui/markdown";
import { isEmptyRichHtml, RichHtml } from "@/shared/ui/rich-html";

import {
  ApplicationActivitySection,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  ApplicationStageBadge,
  ApplicationStatusBadge,
  actionsFor,
  coverLetterDownloadUrl,
  formatCoverLetterCopy,
  formatOutreachCopy,
  materialsFor,
  resumeDownloadUrl,
  useRegenerateAgentTakeMutation,
  writeClipboardText,
  type ApplicationMaterialKind,
  type MaterialActionId
} from "@/features/applications";

import {
  ItemInfoPanel,
  ItemInfoSection,
  ItemInfoSections,
  PanelEditButton
} from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { ApplicationActionGroup } from "@/pages/dashboard/tracked-jobs/ui/application-action-group";
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

const HIRING_REGION_LABELS: Record<string, string> = {
  worldwide: "Worldwide",
  mena: "MENA",
  emea: "EMEA",
  eu: "EU",
  uk: "UK",
  us: "US",
  latam: "LatAm",
  africa: "Africa",
  apac: "APAC",
  egypt: "Egypt",
  saudi_arabia: "Saudi Arabia",
  de: "Germany",
  br: "Brazil"
};

function formatHiringRegion(value: string): string {
  const slug = value.trim().toLowerCase();
  return HIRING_REGION_LABELS[slug] ?? value.trim().replaceAll("_", " ");
}

function workModeLabel(workMode: ApplicationOutput["workMode"]) {
  return workMode ? WORK_MODE_LABELS[workMode] : null;
}

/** Header/location line: remote jobs must show Remote, not only LatAm. */
function locationHeadline(item: ApplicationOutput): string | null {
  const location = item.location?.trim() ?? "";
  const remoteLabel = workModeLabel(item.workMode);
  if (item.workMode === "remote") {
    if (!location) return remoteLabel;
    if (/\bremote\b/i.test(location)) return location;
    return remoteLabel ? `${remoteLabel} · ${location}` : location;
  }
  return location || null;
}

function skillChipKey(skill: JobSkillTag): string {
  return `${skill.band}:${skill.stackId ?? ""}:${skill.name}`;
}

function SkillChips({ skills }: { skills: JobSkillTag[] }) {
  if (skills.length === 0) return "—";
  return (
    <span className="flex flex-wrap justify-end gap-1.5">
      {skills.map((skill) => (
        <Badge
          key={skillChipKey(skill)}
          variant="secondary"
          size="sm"
          className="font-normal tracking-normal normal-case"
        >
          {skill.name}
        </Badge>
      ))}
    </span>
  );
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

async function copyText(label: string, value: string | null) {
  if (!value) {
    toast.error(`Nothing to copy for ${label}`);
    return;
  }
  const ok = await writeClipboardText(value);
  if (ok) toast.success("Copied");
  else toast.error("Could not copy");
}

function triggerDownload(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = "";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function runPanelMaterialAction(
  app: ApplicationOutput,
  kind: ApplicationMaterialKind,
  actionId: MaterialActionId,
  openMaterialPreview: (applicationId: string, kind: ApplicationMaterialKind) => void
) {
  if (actionId === "preview") {
    openMaterialPreview(app.id, kind);
    return;
  }
  if (actionId === "download") {
    if (kind === "resume" && app.resumeId) {
      triggerDownload(resumeDownloadUrl(app.resumeId));
      return;
    }
    if (kind === "cover-letter" && app.coverLetterR2Key) {
      triggerDownload(coverLetterDownloadUrl(app.id));
      return;
    }
    toast.error("Download unavailable");
    return;
  }
  if (actionId === "copy") {
    if (kind === "cover-letter") {
      void copyText("cover letter", formatCoverLetterCopy(app));
      return;
    }
    if (kind === "outreach") {
      void copyText("outreach email", formatOutreachCopy(app));
    }
  }
}

function MaterialsActionCards({ item }: { item: ApplicationOutput }) {
  const { openMaterialPreview } = useApplicationStore();

  return (
    <div className="space-y-2.5">
      {materialsFor(item).map((material) => {
        const actions = actionsFor(material.kind, item);
        const Icon = material.kind === "outreach" ? MailIcon : FileTextIcon;
        return (
          <div
            key={material.kind}
            className="rounded-xl border border-border/80 bg-muted/20 p-3 dark:bg-muted/10"
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted/60">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{material.label}</p>
                <p className="text-xs text-muted-foreground">{material.meta}</p>
              </div>
            </div>
            <Group aria-label={`${material.label} actions`}>
              {actions.map((action, index) => (
                <Fragment key={action.id}>
                  {index > 0 ? <GroupSeparator /> : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="active:scale-[0.96]"
                    onClick={() =>
                      runPanelMaterialAction(item, material.kind, action.id, openMaterialPreview)
                    }
                  >
                    {action.id === "preview" ? <EyeIcon className="size-3.5" aria-hidden /> : null}
                    {action.id === "download" ? (
                      <DownloadIcon className="size-3.5" aria-hidden />
                    ) : null}
                    {action.id === "copy" ? <CopyIcon className="size-3.5" aria-hidden /> : null}
                    {action.label}
                  </Button>
                </Fragment>
              ))}
            </Group>
          </div>
        );
      })}

      {item.recruiterEmail || item.outreachSentAt ? (
        <dl className="space-y-2.5 pt-1">
          {item.recruiterEmail ? (
            <DetailRow label="Recruiter">{item.recruiterEmail}</DetailRow>
          ) : null}
          {item.outreachSentAt ? (
            <DetailRow label="Outreach sent">{formatWhen(item.outreachSentAt)}</DetailRow>
          ) : null}
        </dl>
      ) : null}
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
  const locationLine = locationHeadline(item);

  return (
    <>
      <ItemInfoPanel
        eyebrow={
          <ItemAvatar
            name={item.companyName}
            size={48}
            selected
            className="size-12"
            aria-label={item.companyName}
          />
        }
        eyebrowClassName={ITEM_AVATAR_EYEBROW_CLASSNAME}
        title={item.title}
        description={
          <div className="space-y-2.5">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                <Building2Icon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <TruncatedText>{item.companyName}</TruncatedText>
              </span>
              {locationLine ? (
                <>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span className="inline-flex max-w-[min(100%,16rem)] min-w-0 items-center gap-1 sm:max-w-[20rem]">
                    <MapPinIcon
                      className="size-3.5 shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <TruncatedText>{locationLine}</TruncatedText>
                  </span>
                </>
              ) : null}
              {!isDiscovery && item.employmentType !== "unknown" ? (
                <>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <span className="shrink-0">{EMPLOYMENT_TYPE_LABELS[item.employmentType]}</span>
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
            <span className="flex flex-wrap items-center gap-1.5">
              {item.matchScore != null ? (
                <ApplicationMatchScoreBadge matchScore={item.matchScore} />
              ) : null}
              <ApplicationApplyMethodBadge applyMethod={item.applyMethod} />
              {!isDiscovery ? <ApplicationStageBadge stage={item.stage} /> : null}
              {!isDiscovery ? <ApplicationStatusBadge outcome={item.outcome} /> : null}
              {!isDiscovery && item.hiringUrgency !== "unknown" ? (
                <Badge variant="outline">{HIRING_URGENCY_LABELS[item.hiringUrgency]}</Badge>
              ) : null}
              {(item.sourceTags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" size="sm">
                  {tag in APPLICATION_SOURCE_TAG_LABELS
                    ? APPLICATION_SOURCE_TAG_LABELS[tag as ApplicationSourceTag]
                    : tag}
                </Badge>
              ))}
            </span>
          </div>
        }
        actions={
          !isDiscovery ? (
            <ApplicationActionGroup app={item} variant="panel" />
          ) : (
            <>
              {onEdit ? <PanelEditButton onClick={onEdit} /> : null}
              {item.url ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="active:scale-[0.96]"
                  render={
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open job posting (${postingHost(item.url)})`}
                    />
                  }
                >
                  <ExternalLinkIcon strokeWidth={1.75} />
                </Button>
              ) : null}
            </>
          )
        }
        updatedAt={item.updatedAt}
        createdAt={item.createdAt}
      >
        <ItemInfoSections>
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
              <MaterialsActionCards item={item} />
            </ItemInfoSection>
          ) : null}

          <ItemInfoSection title="Details" icon={<InfoIcon />}>
            <dl className="space-y-2.5">
              <DetailRow label="Work mode">{workModeLabel(item.workMode) ?? "—"}</DetailRow>
              <DetailRow label="Location">{displayText(item.location)}</DetailRow>
              {item.hiringRegion?.trim() ? (
                <DetailRow label="Hiring region">{formatHiringRegion(item.hiringRegion)}</DetailRow>
              ) : null}
              <DetailRow label="Employment">
                {EMPLOYMENT_TYPE_LABELS[item.employmentType]}
              </DetailRow>
              <DetailRow label="Salary">{displayText(item.salaryRange)}</DetailRow>
              <DetailRow label="Required skills">
                <SkillChips skills={item.requiredSkills ?? []} />
              </DetailRow>
              <DetailRow label="Preferred skills">
                <SkillChips skills={item.preferredSkills ?? []} />
              </DetailRow>
              <DetailRow label="Source">{sourceDisplay ?? "—"}</DetailRow>
              <DetailRow label="Apply method">
                {item.applyMethod === "unknown"
                  ? "—"
                  : APPLICATION_APPLY_METHOD_LABELS[item.applyMethod]}
              </DetailRow>
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

          <ItemInfoSection title="Activity" icon={<HistoryIcon />} bodyClassName="mt-3.5 ps-0">
            <ApplicationActivitySection applicationId={item.id} hideHeading />
          </ItemInfoSection>
        </ItemInfoSections>
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
