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

import { isCustomDomainHost } from "@/shared/lib/primary-app-url";
import {
  createPublicSurface,
  portfolioHomePath,
  publicReposListPath
} from "@/shared/lib/public-surface";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";
import { ContactButton } from "@/shared/ui/contact-button";

import { useGetOwnPortfolioListQuery, useGetPortfolioListQuery } from "@/features/portfolio";

const PublicItems = [{ href: "/", label: "Home" }] as const;

/** True when the URL is a public `/{username}` (or nested) portfolio surface. */
function isPublicProfilePath(pathname: string, pathUsername: string | undefined): boolean {
  if (!pathUsername?.trim()) return false;
  // Dashboard / auth / playground must never treat a param as a public slug.
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/playground") ||
    pathname.startsWith("/repos")
  ) {
    return false;
  }
  return true;
}

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
    href: "/dashboard/review",
    label: "Review",
    group: "Dashboard",
    matchPrefix: "/dashboard/review"
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

export function PublicSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const params = useParams({ strict: false }) as { username?: string };
  const { user } = useAuthSuspense();
  const isSignedIn = !!user;

  // Session may omit additionalFields depending on client plugins; profile.get is authoritative.
  const ownProfileQuery = useQuery({
    ...orpcQueryClient.profile.get.queryOptions({ input: { disableContacts: true } }),
    enabled: isSignedIn
  });

  const pathUsername = params.username;
  const onPublicProfile = isPublicProfilePath(pathname, pathUsername);
  const ownUsername = sessionUsernameFromUser(user) ?? ownProfileQuery.data?.username ?? undefined;

  // Nav links: public page slug, else own slug for "Portfolio" / "Repositories".
  const username = (onPublicProfile ? pathUsername : ownUsername) ?? "";
  const onCustomDomainPublic =
    typeof window !== "undefined" &&
    isCustomDomainHost(window.location.hostname) &&
    (pathname === "/" || pathname.startsWith("/repos"));

  const tenantForSurface = username.length > 0 ? username : (ownUsername ?? "");
  const publicSurface =
    tenantForSurface.length > 0 || onCustomDomainPublic
      ? createPublicSurface({
          tenantUsername: tenantForSurface.length > 0 ? tenantForSurface : "unknown",
          mode: onCustomDomainPublic ? "custom_domain" : "path"
        })
      : null;

  // Contacts footer:
  // - Public profile pages: list by path slug (no session required).
  // - Dashboard: list via session only (omit username) so a missing/stale client
  //   slug cannot 404 "Profile not found" while the user is signed in.
  const publicPortfolioQuery = useGetPortfolioListQuery(pathUsername ?? "", {
    enabled: onPublicProfile
  });
  const ownPortfolioQuery = useGetOwnPortfolioListQuery({
    enabled: isSignedIn && !onPublicProfile
  });
  const portfolioQuery = onPublicProfile ? publicPortfolioQuery : ownPortfolioQuery;

  const publicItems: NavItem[] = [
    ...PublicItems,
    ...(publicSurface && publicSurface.tenantUsername !== "unknown"
      ? ([
          { href: portfolioHomePath(publicSurface), label: "Portfolio" },
          { href: publicReposListPath(publicSurface), label: "Repositories" }
        ] satisfies NavItem[])
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
