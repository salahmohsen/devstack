import { ExternalLink } from "lucide-react";

import { type ProjectPublicOutput, type StackOutput } from "@tsu-stack/core";
import { Card6 } from "@tsu-stack/ui/components/cardcn/card-6";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import {
  NativeMarquee,
  SideFadeGradients,
  type NativeMarqueeItem
} from "@tsu-stack/ui/components/uitripled/native-marquee";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon";

import { useGetPortfolioListQuery } from "@/features/portfolio";

const chipClassName =
  "inline-flex h-5 items-center gap-1 rounded-none border border-border bg-background px-2 text-[0.65rem] font-medium leading-none tracking-wide whitespace-nowrap text-muted-foreground uppercase transition-colors hover:border-foreground/25 hover:bg-muted hover:text-foreground";

function formatStackType(type: string | null | undefined): string | null {
  if (!type?.trim()) return null;
  return type.replace(/[_-]+/g, " ").trim();
}

/** Fixed size-3 slot so chips with/without icons share the same leading edge and height. */
function StackChipIcon({ stack, className }: { stack: StackOutput; className?: string }) {
  return (
    <span
      className={cn("inline-flex size-3 shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      {stack.icon ? (
        <Icon icon={stack.icon} name={stack.name} className="size-3 saturate-0" />
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
      <span>{stack.name}</span>
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

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-10 p-0">
      {projects.map((project) => (
        <li key={project.id} className="min-w-0">
          <ProjectsItem project={project} />
        </li>
      ))}
    </ul>
  );
};

export const ProjectsItem = ({ project }: { project: ProjectPublicOutput }) => {
  const yearLabel = `${String(project.year)}${project.isPresent ? " — current" : ""}`;

  const title = (
    <span className="inline-flex min-w-0 items-center gap-2">
      {project.logo ? (
        <img
          src={project.logo}
          alt=""
          className="size-7 shrink-0 rounded-md object-contain saturate-0"
        />
      ) : null}
      <span className="min-w-0 truncate">{project.title}</span>
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
      <div className="relative w-full min-w-0 space-y-1.5">
        <SideFadeGradients sizeClassName="w-6" fromClassName="from-card" />
        <NativeMarquee items={row1} speed={4} gap={8} pauseOnHover />
        {row2.length > 0 ? (
          <NativeMarquee items={row2} speed={4} gap={8} reverse pauseOnHover />
        ) : null}
      </div>
    ) : null;

  const summary = project.summary?.trim();
  const description = project.description?.trim();
  const hasBody = Boolean(summary || description);

  return (
    <Card6
      className="h-full"
      title={title}
      description={yearLabel}
      action={action}
      footer={stacksFooter}
    >
      {hasBody ? (
        /*
         * better-layout body: order by importance
         * 1) summary — primary takeaway (tighter, stronger)
         * 2) description — secondary detail (muted, more space after summary = 2× group gap)
         * Shared leading edge via single column flex.
         */
        <div className="flex flex-col gap-3">
          {summary ? (
            <div
              className="text-sm leading-snug font-medium text-pretty text-foreground/90 [&_li]:mb-1 [&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          ) : null}
          {description ? (
            <div
              className={cn(
                "text-sm leading-relaxed text-muted-foreground [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4",
                summary && "border-t border-border/40 pt-3"
              )}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : null}
        </div>
      ) : null}
    </Card6>
  );
};
