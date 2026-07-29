import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "@tanstack/react-router";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuthSuspense } from "@tsu-stack/auth/react";
import {
  Sidebar001,
  Sidebar001Content,
  Sidebar001Footer,
  Sidebar001Item,
  Sidebar001Section
} from "@tsu-stack/ui/components/unlumen-ui/sidebar-001";

import { ContactButton } from "@/shared/ui/contact-button";

import { useGetPortfolioListQuery } from "@/features/portfolio";

const PublicItems = [{ href: "/", label: "Home" }] as const;

const DashboardItems = [
  { href: "/dashboard", label: "Agent", group: "Dashboard" },
  { href: "/dashboard/onboarding", label: "Onboarding", group: "Dashboard" },
  { href: "/dashboard/experiences", label: "Experiences", group: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects", group: "Dashboard" },
  { href: "/dashboard/stacks", label: "Stack", group: "Dashboard" },
  { href: "/dashboard/resumes", label: "Resumes", group: "Dashboard" },
  { href: "/dashboard/applications", label: "Applications", group: "Dashboard" },
  {
    href: "/dashboard/mail/applications",
    label: "Mail",
    group: "Dashboard",
    matchPrefix: "/dashboard/mail"
  },
  {
    href: "/dashboard/settings/profile",
    label: "Settings",
    group: "Dashboard",
    /** Keep Settings active across profile/account/invites/domain tabs. */
    matchPrefix: "/dashboard/settings"
  }
] as const;

type NavItem = { href: string; label: string; group?: string; matchPrefix?: string };

type Section = { label?: string; items: NavItem[] };

function groupBySection(items: readonly NavItem[]): Section[] {
  const grouped = new Map<string, NavItem[]>();
  const ungrouped: NavItem[] = [];

  for (const item of items) {
    if (item.group) {
      const list = grouped.get(item.group) ?? [];
      list.push(item);
      grouped.set(item.group, list);
    } else {
      ungrouped.push(item);
    }
  }

  const sections: Section[] = [];
  if (ungrouped.length > 0) sections.push({ items: ungrouped });
  for (const [label, list] of grouped) sections.push({ label, items: list });
  return sections;
}

function sessionProfileName(user: unknown): string | undefined {
  if (typeof user !== "object" || user === null) return undefined;
  if (!("profileName" in user)) return undefined;
  const value = (user as { profileName?: unknown }).profileName;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function PublicSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const params = useParams({ strict: false }) as { profileName?: string };
  const { user } = useAuthSuspense();
  const isSignedIn = !!user;

  // Session may omit additionalFields depending on client plugins; profile.get is authoritative.
  const ownProfileQuery = useQuery({
    ...orpcQueryClient.profile.get.queryOptions({ input: { disableContacts: true } }),
    enabled: isSignedIn
  });

  // Prefer the public profile route param; fall back to session / own profile for dashboard.
  const profileName =
    params.profileName ?? sessionProfileName(user) ?? ownProfileQuery.data?.profileName ?? "";
  const portfolioQuery = useGetPortfolioListQuery(profileName, {
    enabled: Boolean(profileName)
  });

  const publicItems: NavItem[] = [
    ...PublicItems,
    ...(profileName
      ? [
          { href: `/${profileName}`, label: "Portfolio" },
          { href: `/${profileName}/repos`, label: "Repositories" }
        ]
      : [])
  ];

  const sections = [
    ...groupBySection(publicItems),
    ...(isSignedIn ? groupBySection(DashboardItems) : [])
  ];

  return (
    <Sidebar001>
      <Sidebar001Content>
        {sections.map((section, index) => (
          <Sidebar001Section key={section.label ?? `ungrouped-${index}`} label={section.label}>
            {section.items.map((item) => (
              <Sidebar001Item
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={
                  item.matchPrefix
                    ? pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
                    : pathname === item.href || pathname === `${item.href}/`
                }
              />
            ))}
          </Sidebar001Section>
        ))}
      </Sidebar001Content>
      <Sidebar001Footer>
        <div className="flex justify-center gap-2">
          {(portfolioQuery.data?.contacts ?? []).map((contact) => (
            <ContactButton key={contact.id} contact={contact} />
          ))}
        </div>
      </Sidebar001Footer>
    </Sidebar001>
  );
}
