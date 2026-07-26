import { Link, type NavigateOptions, useRouterState } from "@tanstack/react-router";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@tsu-stack/ui/components/breadcrumb";

const KNOWN_SEGMENTS = new Set([
  "dashboard",
  "resume",
  "experiences",
  "projects",
  "stacks",
  "new",
  "settings",
  "profile",
  "account"
]);

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  resume: "Resume",
  experiences: "Experience",
  projects: "Project",
  stacks: "Stacks",
  new: "New",
  settings: "Settings",
  profile: "Profile",
  account: "Account"
};

function isIdSegment(segment: string) {
  return !KNOWN_SEGMENTS.has(segment);
}

export function DashboardBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("{-") && !s.startsWith("__"));

  const crumbs: Array<{ label: string; path: string; isLast: boolean }> = [];
  let accumulatedPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    accumulatedPath += `/${segment}`;

    if (isIdSegment(segment)) {
      crumbs.push({
        label: "Edit",
        path: accumulatedPath,
        isLast: i === segments.length - 1
      });
    } else if (SEGMENT_LABELS[segment]) {
      crumbs.push({
        label: SEGMENT_LABELS[segment],
        path: accumulatedPath,
        isLast: i === segments.length - 1
      });
    }
  }

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.path}>
            {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="hidden md:block"
                  render={<Link to={crumb.path as NavigateOptions["to"]} />}
                >
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
