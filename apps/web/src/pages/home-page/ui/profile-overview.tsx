import {
  BriefcaseBusiness,
  CodeXml,
  Link as LinkIcon,
  Lightbulb,
  Mail,
  MapPin,
  Phone
} from "lucide-react";
import { type ComponentType, type ReactNode } from "react";

import { type ContactOutput, type ExperiencePublicOutput } from "@tsu-stack/core";
import { cn } from "@tsu-stack/ui/lib/utils";

import { type GithubProfileQueryResult } from "@/pages/home-page/api/get-github-profile.query";

type ProfileOverviewProps = {
  profile: GithubProfileQueryResult | null | undefined;
  experiences: ExperiencePublicOutput[];
  contacts: ContactOutput[];
  className?: string;
};

type IntroRow = {
  key: string;
  icon: ReactNode;
  label: string;
  href?: string;
  /** Full-width row (jobs span both columns on sm+). */
  span?: boolean;
};

/**
 * Chanhdai-style overview meta grid: 2-col intro rows with full-bleed
 * screen-lines, side borders, and a dashed vertical mid-line.
 */
export function ProfileOverview({
  profile,
  experiences,
  contacts,
  className
}: ProfileOverviewProps) {
  const rows = buildIntroRows({ profile, experiences, contacts });

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      data-slot="panel"
      className={cn(
        // Horizontal edges come from the shared max-w-3xl border-x column on home-page.
        "screen-line-top screen-line-bottom relative",
        className
      )}
    >
      <h2 className="sr-only">Overview</h2>

      <div data-slot="panel-body" className="relative grid gap-x-4 gap-y-2.5 p-4 sm:grid-cols-2">
        {rows.map((row) => (
          <IntroItem key={row.key} className={row.span ? "sm:col-span-2" : undefined}>
            <IntroItemIcon>{row.icon}</IntroItemIcon>
            <IntroItemContent>
              {row.href ? (
                <a
                  href={row.href}
                  target={row.href.startsWith("#") ? "_self" : "_blank"}
                  rel={row.href.startsWith("#") ? undefined : "noopener noreferrer"}
                  className="underline-offset-4 transition-colors hover:underline"
                  aria-label={row.label}
                >
                  {row.label}
                </a>
              ) : (
                <span>{row.label}</span>
              )}
            </IntroItemContent>
          </IntroItem>
        ))}
      </div>

      {/* Dashed vertical mid divider (sm+) — tips fade like outer rails */}
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-1 hidden w-px -translate-x-2.25 max-sm:hidden sm:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-line) 0 4px, transparent 4px 8px)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, #000 clamp(6rem, 18vh, 12rem), #000 calc(100% - clamp(6rem, 18vh, 12rem)), transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0, #000 clamp(6rem, 18vh, 12rem), #000 calc(100% - clamp(6rem, 18vh, 12rem)), transparent 100%)"
        }}
        aria-hidden
      />
    </section>
  );
}

function IntroItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-4 font-mono text-sm", className)} {...props} />;
}

function IntroItemIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border border-muted-foreground/15 bg-muted ring-1 ring-border/50 ring-offset-1 ring-offset-background dark:ring-line",
        "[&_svg]:pointer-events-none [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function IntroItemContent({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("min-w-0 text-balance", className)} {...props} />;
}

function buildIntroRows({
  profile,
  experiences,
  contacts
}: {
  profile: GithubProfileQueryResult | null | undefined;
  experiences: ExperiencePublicOutput[];
  contacts: ContactOutput[];
}): IntroRow[] {
  const rows: IntroRow[] = [];
  const byType = indexContacts(contacts);

  // Jobs: present experiences first, else github company, else first experience.
  const presentJobs = experiences.filter((e) => e.isPresent);
  const jobSource = presentJobs.length > 0 ? presentJobs : experiences.slice(0, 2);

  if (jobSource.length > 0) {
    for (const exp of jobSource.slice(0, 4)) {
      const title = exp.title?.trim() || "Role";
      const org = exp.organization?.trim();
      rows.push({
        key: `job-${exp.id}`,
        icon: <JobIcon title={title} />,
        label: org ? `${title} @${org}` : title,
        href: `#experience`,
        span: true
      });
    }
  } else if (profile?.company?.trim()) {
    const company = stripGithubCompany(profile.company);
    rows.push({
      key: "github-company",
      icon: <JobIcon title={company} />,
      label: company.startsWith("@") ? `Works @${company.slice(1)}` : company,
      span: true
    });
  }

  const location = byType.location?.value?.trim() ?? profile?.location?.trim() ?? null;
  if (location) {
    rows.push({
      key: "location",
      icon: <MapPin />,
      label: location,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    });
  }

  const phone = byType.phone?.value?.trim();
  if (phone) {
    const tel = phone.replace(/[^\d+]/g, "") || phone;
    rows.push({
      key: "phone",
      icon: <Phone />,
      label: phone,
      href: `tel:${tel}`
    });
  }

  const email = byType.email?.value?.trim();
  if (email) {
    rows.push({
      key: "email",
      icon: <Mail />,
      label: email,
      href: `mailto:${email}`
    });
  }

  const websiteRaw = byType.website?.value?.trim() ?? profile?.blog?.trim() ?? null;
  if (websiteRaw) {
    const href = ensureHttp(websiteRaw);
    rows.push({
      key: "website",
      icon: <LinkIcon />,
      label: displayUrl(href),
      href
    });
  }

  return rows;
}

function indexContacts(contacts: ContactOutput[]) {
  const map: Partial<Record<ContactOutput["type"], ContactOutput>> = {};
  for (const c of contacts) {
    map[c.type] ??= c;
  }
  return map;
}

function JobIcon({ title }: { title: string }) {
  const Icon: ComponentType<{ className?: string }> = /(developer|engineer)/i.test(title)
    ? CodeXml
    : /(founder|co-founder)/i.test(title)
      ? Lightbulb
      : BriefcaseBusiness;
  return <Icon />;
}

function stripGithubCompany(company: string) {
  return company.trim();
}

function ensureHttp(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function displayUrl(href: string) {
  try {
    const u = new URL(href);
    return (
      u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname.replace(/\/$/, ""))
    );
  } catch {
    return href.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}
