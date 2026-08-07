import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { sanitizeHtml, type ProjectPublicOutput, type StackOutput } from "@tsu-stack/core";
import { AnimatedWash } from "@tsu-stack/ui/components/animated-wash";
import { Card6 } from "@tsu-stack/ui/components/cardcn";
import { CenterUnderline } from "@tsu-stack/ui/components/fancy/text";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import { StickyCardStack } from "@tsu-stack/ui/components/skiper-ui";
import { NativeMarquee, type NativeMarqueeItem } from "@tsu-stack/ui/components/uitripled";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon";

import { useGetPortfolioListQuery } from "@/features/portfolio";

const chipClassName = cn(
  // Fixed h + items-center keeps icon glyph and uppercase label on one midline.
  // better-layout: controls float above the content layer (wash) — solid surface, not
  // transparent-on-texture. better-colors: semantic primary pair for readable contrast.
  "inline-flex h-5 items-center gap-1 rounded-none border border-transparent bg-muted px-2",
  "text-[0.65rem] leading-none font-medium tracking-wide whitespace-nowrap uppercase",
  "text-primary transition-colors hover:bg-primary/20",
  // Kill button/link defaults from PreviewCardTrigger that skew flex centering.
  "font-[inherit] no-underline"
);

/**
 * Wash tint matches the contribution graph's high-intensity green (dark theme
 * level-4). Same hue/chroma family as THEMES.GREEN in contribution-graph.tsx.
 * @see apps/web/src/pages/home-page/ui/contribution-graph.tsx
 */
const WASH_GREEN = "oklch(0.78 0.22 150)";

function formatStackType(type: string | null | undefined): string | null {
  if (!type?.trim()) return null;
  return type.replace(/[_-]+/g, " ").trim();
}

/**
 * Icon slot matches font-size (1em) so the glyph is the same optical height as
 * the uppercase label; empty slot reserved so chips without icons stay aligned.
 */
function StackChipIcon({ stack, className }: { stack: StackOutput; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-[1em] shrink-0 items-center justify-center overflow-hidden leading-none",
        className
      )}
      aria-hidden
    >
      {stack.icon ? (
        <Icon
          icon={stack.icon}
          name={stack.name}
          className="flex size-full items-center justify-center saturate-0 [&_svg]:block [&_svg]:size-full"
        />
      ) : null}
    </span>
  );
}

function StackChip({ stack }: { stack: StackOutput }) {
  const description = stack.description?.trim();
  const typeLabel = formatStackType(stack.type);

  const label = (
    <>
      <StackChipIcon stack={stack} />
      <span className="leading-none">{stack.name}</span>
    </>
  );

  if (!description) {
    return <span className={chipClassName}>{label}</span>;
  }

  return (
    <PreviewCard>
      <PreviewCardTrigger className={cn(chipClassName, "cursor-default")}>
        {label}
      </PreviewCardTrigger>
      {/*
        better-layout: one leading edge, header group tight, body spaced 2×,
        comfortable measure (w-72), no text-balance jank on short labels.
      */}
      <PreviewCardPopup
        className="w-72 flex-col gap-0 p-0 text-start text-pretty shadow-lg/10"
        sideOffset={10}
        align="center"
      >
        <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50">
            {stack.icon ? (
              <Icon icon={stack.icon} name={stack.name} className="size-4" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {stack.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm leading-snug font-semibold text-popover-foreground">
              {stack.name}
            </p>
            {typeLabel ? (
              <p className="text-[0.65rem] leading-none font-medium tracking-wider text-muted-foreground uppercase">
                {typeLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border/50 px-3.5 pt-2.5 pb-3.5">
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </PreviewCardPopup>
    </PreviewCard>
  );
}

export const ProjectsSection = ({ profileName }: { profileName: string }) => {
  const portfolioQuery = useGetPortfolioListQuery(profileName);
  const projects = portfolioQuery.data?.projects ?? [];

  if (projects.length === 0) return null;

  // Skiper 16 card stack scroll — sticky pile + scale-down on scroll.
  // @see https://skiper-ui.com/v1/skiper16
  return (
    <StickyCardStack>
      {projects.map((project) => (
        <ProjectsItem key={project.id} project={project} />
      ))}
    </StickyCardStack>
  );
};

export const ProjectsItem = ({ project }: { project: ProjectPublicOutput }) => {
  const [hovered, setHovered] = useState(false);
  const yearLabel = `${String(project.year)}${project.isPresent ? " — current" : ""}`;

  // Center underline on the title, driven by whole-card hover (not title-only).
  const title = (
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
    </span>
  );

  const action = project.demoUrl ? (
    <a
      href={project.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${project.title}`}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <ExternalLink className="size-3.5" strokeWidth={2.25} />
    </a>
  ) : null;

  const marqueeItems: NativeMarqueeItem[] = project.stacks.map((stack) => {
    return {
      id: stack.id,
      label: stack.name,
      content: <StackChip stack={stack} />
    };
  });

  // Two horizontal rows; split evenly so both tracks stay populated.
  const mid = Math.ceil(marqueeItems.length / 2);
  const row1 = marqueeItems.slice(0, mid);
  const row2 = marqueeItems.slice(mid);

  const stacksFooter =
    marqueeItems.length > 0 ? (
      // No side fades (from-card would paint solid and hide the wash under the stack).
      <div className="relative z-10 w-full min-w-0 space-y-1.5 bg-transparent">
        <NativeMarquee items={row1} speed={4} gap={8} pauseOnHover />
        {row2.length > 0 ? (
          <NativeMarquee items={row2} speed={4} gap={8} reverse pauseOnHover />
        ) : null}
      </div>
    ) : null;

  const summary = project.summary?.trim();
  const description = project.description?.trim();
  const hasBody = Boolean(summary || description);
  const safeSummary = summary ? sanitizeHtml(summary) : "";
  const safeDescription = description ? sanitizeHtml(description) : "";

  // Neon AnimatedWash — always mounted so the resting grain is visible;
  // data-wash-hover lifts/warms on card hover (same as Neon demo).
  // currentColor = contribution-graph green.
  // @see https://ui.neon.com/brand/animated-wash
  const washOverlay = (
    <AnimatedWash
      className="pointer-events-none absolute inset-0 z-0 size-full"
      style={{ color: WASH_GREEN }}
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
        footer={stacksFooter}
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
