"use client";

import { Link, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Gift,
  Inbox,
  Mail,
  Sparkles,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

import {
  getCategory,
  MAIL_CATEGORIES,
  messagesForCategory,
  type MailMessage
} from "@/pages/dashboard/mail/_lib/mail-mock";

const ICONS = {
  briefcase: BriefcaseBusiness,
  users: Users,
  calendar: CalendarDays,
  gift: Gift,
  inbox: Inbox,
  mail: Mail,
  sparkles: Sparkles
} as const;

function slugToCategoryId(slug: string): string {
  if (slug.startsWith("rule-")) return `rule:${slug.slice("rule-".length)}`;
  return slug;
}

function categoryToSlug(id: string): string {
  return id.startsWith("rule:") ? id.replace("rule:", "rule-") : id;
}

export function MailCategoryPage() {
  const params = useParams({ strict: false }) as { category?: string };
  const categoryId = slugToCategoryId(params.category ?? "all");
  const category = getCategory(categoryId) ?? getCategory("all")!;
  const messages = useMemo(() => messagesForCategory(categoryId), [categoryId]);
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  return (
    <PageLayout>
      <PageHeader
        title={category.title}
        description={category.description}
        actions={
          <Button variant="outline" size="sm" render={<Link to="/dashboard/mail" />}>
            <ArrowLeft className="size-3.5" />
            Hub
          </Button>
        }
      />

      <SurfaceIslandLayout
        islandClassName="md:w-44 lg:w-48"
        island={
          <nav aria-label="Mail categories" className="flex flex-col gap-0.5 p-2">
            {MAIL_CATEGORIES.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.id === categoryId;
              return (
                <Link
                  key={item.id}
                  to="/dashboard/mail/$category"
                  params={{ category: categoryToSlug(item.id) }}
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
                  <span className="text-xs tabular-nums opacity-70">{item.count}</span>
                </Link>
              );
            })}
          </nav>
        }
      >
        <div className="flex min-h-[min(28rem,60dvh)] flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background md:flex-row">
          <MessageList messages={messages} selectedId={selectedId} onSelect={setSelectedId} />
          <MessageReader message={selected} />
        </div>
      </SurfaceIslandLayout>
    </PageLayout>
  );
}

function MessageList({
  messages,
  selectedId,
  onSelect
}: {
  messages: MailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-1 border-b p-6 text-center text-sm text-muted-foreground md:w-72 md:border-r md:border-b-0 lg:w-80">
        No messages in this category (mock).
      </div>
    );
  }

  return (
    <ul className="flex max-h-64 w-full flex-col overflow-y-auto border-b md:max-h-none md:w-72 md:border-r md:border-b-0 lg:w-80">
      {messages.map((message) => {
        const active = message.id === selectedId;
        return (
          <li key={message.id}>
            <button
              type="button"
              onClick={() => onSelect(message.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
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
                  {message.from}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: true })}
                </span>
              </div>
              <span className={cn("truncate text-xs", message.unread && "font-medium")}>
                {message.subject}
              </span>
              <span className="line-clamp-1 text-xs text-muted-foreground">{message.preview}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MessageReader({ message }: { message: MailMessage | null }) {
  if (!message) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Select a message
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="space-y-1 border-b px-4 py-3">
        <h2 className="text-base font-semibold">{message.subject}</h2>
        <p className="text-sm text-muted-foreground">
          {message.from} <span className="text-xs">&lt;{message.fromEmail}&gt;</span>
        </p>
        {message.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {message.labels.map((label) => (
              <span
                key={label}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
      </div>
      <footer className="space-y-2 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Reply assist (draft + confirm) lands with the mail backend wave.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled>
            Reply with agent
          </Button>
          <Button type="button" size="sm" variant="outline" disabled>
            Mark unread
          </Button>
        </div>
      </footer>
    </div>
  );
}
