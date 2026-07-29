"use client";

import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { BriefcaseBusiness, CalendarDays, Gift, Inbox, Mail, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import {
  APPLICATION_STAGE_LABELS,
  MAIL_SYSTEM_CATEGORY_CARDS,
  MAIL_SYSTEM_LABELS,
  MailListCategorySchema,
  mailCategoryToSlug,
  mailSlugToCategoryId,
  smartRuleToCategoryCard,
  type MailCategoryCard,
  type MailListCategory,
  type MailMessageDetail,
  type MailMessageListItem,
  type MailSystemLabel
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { RichTextEditor } from "@tsu-stack/ui/components/rich-text-editor";
import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";
import { DefaultLoader } from "@/shared/ui/default-loader";

import {
  useCorrectMailClassificationMutation,
  useGetMailQuery,
  useListMailQuery,
  useUndoMailCrmApplyMutation
} from "@/features/mail";
import { useListMailSmartRulesQuery } from "@/features/mail-smart-rules";
import { useCreateReplyDraftMutation } from "@/features/review";

import { ItemsEmpty, PageHeader, PageLayout } from "@/widgets/items-page";

const EMPTY_MESSAGES: MailMessageListItem[] = [];

const ICONS = {
  briefcase: BriefcaseBusiness,
  users: Users,
  calendar: CalendarDays,
  gift: Gift,
  inbox: Inbox,
  mail: Mail,
  sparkles: Sparkles
} as const;

/** Labels that are user-actionable career signals (drop generic ATS noise). */
const CAREER_LABELS = new Set(["recruiter", "interview", "offer", "application"]);

const LABEL_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "info" | "success" | "warning"
> = {
  interview: "info",
  offer: "success",
  recruiter: "warning",
  application: "secondary"
};

function resolveCategoryCard(categoryId: string): MailCategoryCard {
  const system = MAIL_SYSTEM_CATEGORY_CARDS.find((c) => c.id === categoryId);
  if (system) return system;

  const slug = categoryId.startsWith("rule:") ? categoryId.slice("rule:".length) : categoryId;
  const title = slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: categoryId as MailListCategory,
    title: title || "Smart rule",
    description: "Smart rule",
    icon: "sparkles",
    kind: "rule"
  };
}

function parseCategoryParam(slug: string | undefined): MailListCategory {
  const categoryId = mailSlugToCategoryId(slug ?? "all");
  const parsed = MailListCategorySchema.safeParse(categoryId);
  if (parsed.success) return parsed.data;
  return "all";
}

function careerLabels(labels: readonly string[]): string[] {
  return labels.filter((l) => CAREER_LABELS.has(l));
}

function agentDraftHtml(from: string): string {
  const firstName = from.split(" ")[0] ?? from;
  return `<p>Hi ${firstName},</p><p>Thanks for reaching out — happy to chat. I’m available later this week if that still works.</p><p>Best</p>`;
}

function MessageTags({
  labels,
  application,
  className
}: {
  labels: readonly string[];
  application?: { companyName: string; title: string } | null;
  className?: string;
}) {
  const career = careerLabels(labels);
  if (career.length === 0 && !application) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)} aria-label="Message tags">
      {career.map((label) => (
        <Badge
          key={label}
          size="sm"
          variant={LABEL_BADGE_VARIANT[label] ?? "outline"}
          className="capitalize"
        >
          {label}
        </Badge>
      ))}
      {application ? (
        <Badge size="sm" variant="outline" className="gap-0.5 font-medium normal-case">
          <BriefcaseBusiness className="size-2.5 opacity-70" aria-hidden />
          {application.companyName}
        </Badge>
      ) : null}
    </div>
  );
}

export function MailCategoryPage() {
  const params = useParams({ strict: false }) as { category?: string };
  const categoryId = parseCategoryParam(params.category);

  const listQuery = useListMailQuery({ category: categoryId });
  const rulesQuery = useListMailSmartRulesQuery();
  const messages = listQuery.data ?? EMPTY_MESSAGES;

  const navCards = useMemo(() => {
    const system = [...MAIL_SYSTEM_CATEGORY_CARDS];
    const rules = (rulesQuery.data ?? [])
      .filter((r) => r.enabled)
      .map((r) => smartRuleToCategoryCard(r));
    // Insert smart rules before unsorted/all (last two system cards).
    const head = system.slice(0, -2);
    const tail = system.slice(-2);
    return [...head, ...rules, ...tail] as MailCategoryCard[];
  }, [rulesQuery.data]);

  const category = navCards.find((c) => c.id === categoryId) ?? resolveCategoryCard(categoryId);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // When category changes or list updates, keep selection only if still present.
  const activeId = useMemo(() => {
    const list = listQuery.data ?? EMPTY_MESSAGES;
    if (selectedId && list.some((m) => m.id === selectedId)) return selectedId;
    return list[0]?.id ?? null;
  }, [listQuery.data, selectedId]);

  const selectedListItem = activeId ? (messages.find((m) => m.id === activeId) ?? null) : null;
  const detailQuery = useGetMailQuery(activeId);

  const listCount = listQuery.isSuccess ? messages.length : null;

  return (
    <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-3 overflow-hidden p-5">
      <PageHeader title={category.title} />

      <SurfaceIslandLayout
        className="min-h-0 flex-1"
        islandClassName="md:w-44 lg:w-48"
        island={
          <nav
            aria-label="Mail categories"
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
          >
            {navCards.map((item) => {
              const Icon = ICONS[item.icon] ?? Sparkles;
              const active = item.id === categoryId;
              return (
                <Link
                  key={item.id}
                  to="/dashboard/mail/$category"
                  params={{ category: mailCategoryToSlug(item.id) }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-background font-medium text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {active && listCount != null ? (
                    <span className="text-xs tabular-nums opacity-50">{listCount}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background md:flex-row">
          {listQuery.isLoading ? (
            <div className="flex min-h-0 w-full flex-1 items-center justify-center border-b p-6 md:w-72 md:flex-none md:border-r md:border-b-0 lg:w-80">
              <DefaultLoader />
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 border-b p-6 text-center md:w-72 md:flex-none md:border-r md:border-b-0 lg:w-80">
              <p className="text-sm text-muted-foreground">Couldn’t load messages.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <MessageList
              messages={messages}
              selectedId={activeId}
              onSelect={setSelectedId}
              categoryTitle={category.title}
            />
          )}
          <MessageReader
            key={activeId ?? "empty"}
            listItem={selectedListItem}
            detail={detailQuery.data ?? null}
            isLoadingDetail={Boolean(activeId) && detailQuery.isLoading}
          />
        </div>
      </SurfaceIslandLayout>
    </PageLayout>
  );
}

function MessageList({
  messages,
  selectedId,
  onSelect,
  categoryTitle
}: {
  messages: MailMessageListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  categoryTitle: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center border-b p-6 md:w-72 md:flex-none md:border-r md:border-b-0 lg:w-80">
        <ItemsEmpty
          icon={<Inbox aria-hidden />}
          title="No messages"
          description={`Nothing in ${categoryTitle} yet. New career mail will show up here.`}
          className="border-0 p-0"
        />
      </div>
    );
  }

  return (
    <ul
      aria-label="Messages"
      className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-b md:w-72 md:flex-none md:border-r md:border-b-0 lg:w-80"
    >
      {messages.map((message) => {
        const active = message.id === selectedId;
        return (
          <li key={message.id}>
            <button
              type="button"
              onClick={() => onSelect(message.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
                active ? "bg-muted/70" : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    message.unread ? "font-semibold" : "font-medium"
                  )}
                >
                  {message.fromName}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
                </span>
              </div>
              <span className={cn("truncate text-xs", message.unread && "font-medium")}>
                {message.subject}
              </span>
              <span className="line-clamp-1 text-xs text-muted-foreground">{message.preview}</span>
              <MessageTags
                labels={message.labels}
                application={message.application}
                className="pt-0.5"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MessageReader({
  listItem,
  detail,
  isLoadingDetail
}: {
  listItem: MailMessageListItem | null;
  detail: MailMessageDetail | null;
  isLoadingDetail: boolean;
}) {
  if (!listItem) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Select a message
      </div>
    );
  }

  return (
    <MessageReaderBody listItem={listItem} detail={detail} isLoadingDetail={isLoadingDetail} />
  );
}

function MessageReaderBody({
  listItem,
  detail,
  isLoadingDetail
}: {
  listItem: MailMessageListItem;
  detail: MailMessageDetail | null;
  isLoadingDetail: boolean;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [agentBanner, setAgentBanner] = useState(false);
  const undoCrm = useUndoMailCrmApplyMutation();
  const correct = useCorrectMailClassificationMutation();
  const createDraft = useCreateReplyDraftMutation();
  const navigate = useNavigate();
  const [correctOpen, setCorrectOpen] = useState(false);

  const message = detail ?? listItem;
  const labels = careerLabels(message.labels);
  const hasChips = labels.length > 0 || Boolean(message.application);
  const bodyText = detail?.bodyText ?? "";
  const isUnsorted =
    !hasSystemCareerOrRuleLabel(message.labels) &&
    message.labels.every((l) => !CAREER_LABELS.has(l));
  const crmApply = detail?.crmApply ?? null;
  const stageAfterLabel =
    crmApply?.stageAfter != null ? APPLICATION_STAGE_LABELS[crmApply.stageAfter] : null;
  const stageBeforeLabel =
    crmApply?.stageBefore != null ? APPLICATION_STAGE_LABELS[crmApply.stageBefore] : null;
  const currentSystem = labels[0] as MailSystemLabel | undefined;
  const canCorrect = Boolean(detail?.id && detail.classifiedAt);

  function submitCorrection(correctedSystemLabels: MailSystemLabel[]) {
    if (!detail?.id) return;
    correct.mutate(
      {
        messageId: detail.id,
        correctedSystemLabels,
        undoCrm: true
      },
      {
        onSuccess: () => setCorrectOpen(false)
      }
    );
  }

  function openManualReply() {
    setAgentBanner(false);
    setComposerOpen(true);
  }

  function openAgentDraft() {
    // Prefer durable Review queue draft (Assist path) over ephemeral composer text.
    if (!detail?.id) {
      setComposerOpen(true);
      setAgentBanner(true);
      setDraft(agentDraftHtml(message.fromName));
      return;
    }
    createDraft.mutate(
      { messageId: detail.id },
      {
        onSuccess: () => {
          void navigate({ to: "/dashboard/review" });
        }
      }
    );
  }

  return (
    <article className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 space-y-2 border-b px-4 py-3">
        <h2 className="text-base leading-snug font-semibold">{message.subject}</h2>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{message.fromName}</span>
          <span className="text-xs">&lt;{message.fromEmail}&gt;</span>
          <span className="text-xs">
            · {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
          </span>
        </p>
        {hasChips ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <MessageTags labels={message.labels} application={message.application} />
            {message.application ? (
              <Link
                to="/dashboard/applications"
                className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {message.application.title}
              </Link>
            ) : null}
          </div>
        ) : isUnsorted ? (
          <p className="text-[11px] text-muted-foreground">
            Unsorted — no career or smart-rule label yet.
          </p>
        ) : null}
        {crmApply && crmApply.effectKind !== "noop" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/40 px-2.5 py-2">
            <p className="text-xs text-muted-foreground">
              {stageAfterLabel
                ? `Stage updated from mail → ${stageAfterLabel}`
                : "CRM updated from this mail"}
              {stageBeforeLabel ? (
                <span className="text-muted-foreground/80"> · was {stageBeforeLabel}</span>
              ) : null}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-xs"
              disabled={undoCrm.isPending}
              onClick={() => {
                undoCrm.mutate({ applyId: crmApply.id });
              }}
            >
              {undoCrm.isPending ? "Undoing…" : "Undo"}
            </Button>
          </div>
        ) : null}
        {canCorrect ? (
          <div className="space-y-2 rounded-md border border-dashed border-border/80 px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Wrong label? Correct it to teach classify (few-shot).
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 text-xs"
                disabled={correct.isPending}
                onClick={() => setCorrectOpen((o) => !o)}
              >
                {correctOpen ? "Cancel" : "Correct"}
              </Button>
            </div>
            {correctOpen ? (
              <div className="flex flex-wrap gap-1.5">
                {(MAIL_SYSTEM_LABELS as readonly MailSystemLabel[]).map((label) => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={currentSystem === label ? "default" : "outline"}
                    className="h-7 capitalize"
                    disabled={correct.isPending || currentSystem === label}
                    onClick={() => submitCorrection([label])}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={!currentSystem ? "default" : "outline"}
                  className="h-7"
                  disabled={correct.isPending || !currentSystem}
                  onClick={() => submitCorrection([])}
                >
                  None
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoadingDetail && !detail ? (
          <div className="flex min-h-24 items-center justify-center">
            <DefaultLoader />
          </div>
        ) : (
          <p className="max-w-[72ch] text-sm leading-relaxed whitespace-pre-wrap">
            {bodyText ?? message.preview}
          </p>
        )}
      </div>

      <footer className="shrink-0 space-y-2 border-t px-4 py-3">
        {composerOpen ? (
          <div className="space-y-2">
            {agentBanner ? (
              <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                Agent draft — confirm in Review before send when Assist mode is on.
              </p>
            ) : null}
            <RichTextEditor
              value={draft}
              onChange={setDraft}
              placeholder="Write your reply…"
              className="bg-background"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" disabled title="Wires with mail backend">
                Send
              </Button>
              {!agentBanner ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={createDraft.isPending}
                  onClick={openAgentDraft}
                >
                  {createDraft.isPending ? "Creating draft…" : "Draft with agent"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setComposerOpen(false);
                  setAgentBanner(false);
                  setDraft("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={openManualReply}>
              Reply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={createDraft.isPending}
              onClick={openAgentDraft}
            >
              {createDraft.isPending ? "Creating draft…" : "Draft with agent"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled
              title="Wires with mail backend"
            >
              Mark unread
            </Button>
          </div>
        )}
      </footer>
    </article>
  );
}

function hasSystemCareerOrRuleLabel(labels: readonly string[]): boolean {
  return labels.some((l) => CAREER_LABELS.has(l) || l.startsWith("rule:"));
}
