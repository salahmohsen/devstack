import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { FaGithub } from "react-icons/fa6";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { sanitizeHtml, type ProjectPublicOutput } from "@tsu-stack/core";
import { AnimatedWash } from "@tsu-stack/ui/components/animated-wash";
import { Button } from "@tsu-stack/ui/components/button";
import { Card6 } from "@tsu-stack/ui/components/cardcn";
import { CenterUnderline } from "@tsu-stack/ui/components/fancy/text";
import { Group } from "@tsu-stack/ui/components/group";
import { StickyCardStack } from "@tsu-stack/ui/components/skiper-ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  createPublicSurface,
  publicRepoOverviewLocation,
  resolvePublicSurface,
  type PublicSurface
} from "@/shared/lib/public-surface";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { useGetPortfolioListQuery } from "@/features/portfolio";

import { StackChip } from "@/pages/home-page/ui/stack-chip";

export const ProjectsSection = ({
  username,
  surfaceMode
}: {
  username: string;
  /** When known from the route loader (custom domain root vs path portfolio). */
  surfaceMode?: "path" | "custom_domain";
}) => {
  const portfolioQuery = useGetPortfolioListQuery(username);
  const projects = portfolioQuery.data?.projects ?? [];
  const { user } = useAuth();
  const sessionUsername = sessionUsernameFromUser(user);
  const isPortfolioOwner = Boolean(sessionUsername && sessionUsername === username);

  const surface = useMemo(() => {
    if (surfaceMode) {
      return createPublicSurface({
        tenantUsername: username,
        mode: surfaceMode
      });
    }
    const hostname = typeof window !== "undefined" ? window.location.hostname : undefined;
    return resolvePublicSurface({ tenantUsername: username, hostname });
  }, [username, surfaceMode]);

  if (projects.length === 0) return null;

  // Skiper 16 card stack scroll — sticky pile + scale-down on scroll.
  // @see https://skiper-ui.com/v1/skiper16
  return (
    <StickyCardStack>
      {projects.map((project) => (
        <ProjectsItem
          key={project.id}
          project={project}
          surface={surface}
          isPortfolioOwner={isPortfolioOwner}
        />
      ))}
    </StickyCardStack>
  );
};

function ProjectRepoButtons({
  project,
  surface,
  isPortfolioOwner,
  className
}: {
  project: ProjectPublicOutput;
  surface: PublicSurface;
  isPortfolioOwner: boolean;
  className?: string;
}) {
  const visible = (project.githubRepos ?? []).filter((r) => !r.isPrivate || isPortfolioOwner);
  if (visible.length === 0) return null;

  const buttons = visible.map((repo) => {
    const location = publicRepoOverviewLocation(surface, repo.name);
    return (
      <Tooltip key={repo.fullName}>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className="text-foreground/80 shadow-none"
              render={<Link to={location.to} params={location.params as never} />}
              aria-label={`Open repository ${repo.name}`}
            />
          }
        >
          <FaGithub className="size-3.5" />
          <span className="sr-only">Open repository {repo.name}</span>
        </TooltipTrigger>
        <TooltipContent>{repo.fullName}</TooltipContent>
      </Tooltip>
    );
  });

  if (visible.length === 1) {
    return <div className={cn("flex items-center", className)}>{buttons}</div>;
  }

  return (
    <Group className={cn("shrink-0", className)} aria-label="Open repositories">
      {buttons}
    </Group>
  );
}

export const ProjectsItem = ({
  project,
  surface,
  isPortfolioOwner
}: {
  project: ProjectPublicOutput;
  surface: PublicSurface;
  isPortfolioOwner: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const yearLabel = `${String(project.year)}${project.isPresent ? " — current" : ""}`;

  // Center underline on the title, driven by whole-card hover (not title-only).
  // Open repo controls always sit next to the title (all breakpoints).
  const stackRow =
    project.stacks.length > 0 ? (
      <span className="flex flex-wrap items-center gap-1.5">
        {project.stacks.map((stack) => (
          <StackChip key={stack.id} stack={stack} />
        ))}
      </span>
    ) : null;

  const title = (
    <span className="flex min-w-0 flex-col gap-2">
      <span className="inline-flex min-w-0 items-center gap-2">
        {project.logo ? (
          <img
            src={project.logo}
            alt=""
            className="size-7 shrink-0 rounded-md object-contain saturate-0"
          />
        ) : null}
        <CenterUnderline active={hovered} className="min-w-0">
          {project.title}
        </CenterUnderline>
        <ProjectRepoButtons
          project={project}
          surface={surface}
          isPortfolioOwner={isPortfolioOwner}
        />
      </span>
      {stackRow}
    </span>
  );

  const action = project.demoUrl ? (
    <a
      href={project.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${project.title} demo`}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3.5" strokeWidth={2.25} />
    </a>
  ) : null;

  const summary = project.summary?.trim();
  const description = project.description?.trim();
  const hasBody = Boolean(summary || description);
  const safeSummary = summary ? sanitizeHtml(summary) : "";
  const safeDescription = description ? sanitizeHtml(description) : "";

  // Neon AnimatedWash — always mounted so the resting grain is visible;
  // data-wash-hover lifts/warms on card hover (same as Neon demo).
  // currentColor via text-brand token (contrib dark level-4 green).
  // @see https://ui.neon.com/brand/animated-wash
  // @see packages/ui/styles/shadcn.css --brand / --color-brand
  const washOverlay = (
    <AnimatedWash
      className="pointer-events-none absolute inset-0 z-0 size-full text-brand"
      // Slightly stronger resting field so the wash reads without hover;
      // hover still lifts via data-wash-hover on the host.
      intensity={0.1}
      noise={0.4}
    />
  );

  return (
    // data-wash-hover: AnimatedWash lifts when this host is hovered.
    // pointer handlers also drive the title center-underline.
    <div
      className="w-full"
      data-wash-hover
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Card6
        // isolate keeps the wash canvas under content without leaking stacking contexts.
        className="isolate w-full transition-[border-color,box-shadow] duration-300"
        title={title}
        description={yearLabel}
        action={action}
        overlay={washOverlay}
      >
        {hasBody ? (
          /*
           * better-layout body: order by importance
           * 1) summary — primary takeaway (tighter, stronger)
           * 2) description — secondary detail (muted, more space after summary = 2× group gap)
           * Shared leading edge via single column flex.
           * HTML sanitized via @tsu-stack/core sanitizeHtml before inject.
           */
          <div className="flex flex-col gap-3">
            {safeSummary ? (
              <div
                className="text-sm leading-snug font-medium text-pretty text-foreground/90 [&_li]:mb-1 [&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4"
                dangerouslySetInnerHTML={{ __html: safeSummary }}
              />
            ) : null}
            {safeDescription ? (
              <div
                className={cn(
                  "text-sm leading-relaxed text-muted-foreground [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4",
                  safeSummary && "border-t border-border/40 pt-3"
                )}
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            ) : null}
          </div>
        ) : null}
      </Card6>
    </div>
  );
};
