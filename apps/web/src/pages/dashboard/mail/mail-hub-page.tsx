"use client";

import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness, CalendarDays, Gift, Inbox, Mail, Sparkles, Users } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceShell } from "@/shared/ui/dashboard-shell";

import { PageHeader, PageLayout } from "@/widgets/items-page";

import { MAIL_CATEGORIES, type MailCategory } from "@/pages/dashboard/mail/_lib/mail-mock";

const ICONS = {
  briefcase: BriefcaseBusiness,
  users: Users,
  calendar: CalendarDays,
  gift: Gift,
  inbox: Inbox,
  mail: Mail,
  sparkles: Sparkles
} as const;

function categorySlug(category: MailCategory) {
  return category.id.startsWith("rule:") ? category.id.replace("rule:", "rule-") : category.id;
}

function CategoryCard({ category }: { category: MailCategory }) {
  const Icon = ICONS[category.icon];
  return (
    <Link
      to="/dashboard/mail/$category"
      params={{ category: categorySlug(category) }}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/50 p-4 text-left shadow-xs/5 transition-colors",
        "hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-background shadow-xs">
          <Icon className="size-4 opacity-80" aria-hidden />
        </span>
        <span className="text-xs text-muted-foreground">
          {category.unread > 0 ? (
            <span className="font-medium text-foreground">{category.unread} unread</span>
          ) : (
            "Up to date"
          )}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">{category.title}</h2>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {category.count}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
        {category.kind === "rule" ? (
          <span className="mt-2 inline-flex text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Smart rule
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function MailHubPage() {
  const system = MAIL_CATEGORIES.filter((c) => c.kind === "system");
  const rules = MAIL_CATEGORIES.filter((c) => c.kind === "rule");

  return (
    <PageLayout>
      <PageHeader
        title="Mail"
        description="Career Inbox — categories and smart rules. Mock data until mail backend lands."
      />

      <SurfaceShell className="gap-6 p-4 sm:p-5">
        <section aria-labelledby="mail-core-heading" className="space-y-3">
          <h2
            id="mail-core-heading"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Categories
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {system.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>

        {rules.length > 0 ? (
          <section aria-labelledby="mail-rules-heading" className="space-y-3">
            <h2
              id="mail-rules-heading"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Smart rules
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rules.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        ) : null}
      </SurfaceShell>
    </PageLayout>
  );
}
