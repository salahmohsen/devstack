import { startTransition, useEffect, useState } from "react";

import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

import { type ItemsNavLayout } from "@/widgets/items-page/lib/use-items-navigation";

import { ItemsInfoFooter } from "./items-info-footer";

/** Matches ClipWidth open duration so markdown mounts after the tween. */
const INSPECT_BODY_DEFER_MS = 400;

/** Mount inspect body after the panel tween so markdown does not fight layout. */
export function useDeferredInspectBody() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startTransition(() => setReady(true));
    }, INSPECT_BODY_DEFER_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return ready;
}

type ItemInfoPanelProps = {
  title: string | React.ReactNode;
  /** Quiet meta row under the title (org, year, badges). */
  description?: string | React.ReactNode;
  /** Top-left mark, like the review-card glyph. */
  eyebrow?: React.ReactNode;
  eyebrowClassName?: string;
  /** Header trailing actions (Save, status, open). */
  actions?: React.ReactNode;
  /** Optional nav under the header (tabs). Stays out of the scroll body. */
  nav?: React.ReactNode;
  headerClassName?: string;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  /** Inspect footer arrows: list (prev/next) or grid (D-pad). Defaults to page nav context. */
  navLayout?: ItemsNavLayout;
  className?: string;
  children: React.ReactNode;
};

/**
 * Dashboard inspect / edit chrome. Editorial review-card: mark + actions,
 * large title, muted meta, then a quiet scrolling body.
 */
export function ItemInfoPanel({
  title,
  description,
  eyebrow,
  eyebrowClassName,
  actions,
  nav,
  headerClassName,
  updatedAt,
  createdAt,
  navLayout,
  className,
  children
}: ItemInfoPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className={cn("shrink-0 px-6 pt-5 pb-5 max-xl:pe-12", headerClassName)}>
        <div className="flex items-center justify-between gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/70 text-muted-foreground [&_img]:size-full [&_img]:object-contain [&_svg]:size-4",
              eyebrowClassName
            )}
          >
            {eyebrow ?? <span className="size-1.5 rounded-full bg-foreground/40" aria-hidden />}
          </div>
          {actions ? (
            <div className="hidden shrink-0 items-center justify-end gap-1.5 xl:flex">
              {actions}
            </div>
          ) : null}
        </div>
        <div className="mt-5 min-w-0">
          {typeof title === "string" ? (
            <h2 className="text-[1.65rem] leading-[1.15] font-semibold tracking-tight text-balance wrap-break-word text-foreground">
              {title}
            </h2>
          ) : (
            title
          )}
          {description ? (
            <div className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {typeof description === "string" ? <p>{description}</p> : description}
            </div>
          ) : null}
          {actions ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 xl:hidden">{actions}</div>
          ) : null}
        </div>
      </header>
      {nav ? <div className="shrink-0 border-b border-border/60 px-6">{nav}</div> : null}
      <ScrollArea className="min-h-0 flex-1" scrollFade fill>
        <div className={cn("px-6 pb-8", nav && "pt-5", className)}>{children}</div>
      </ScrollArea>
      <ItemsInfoFooter updatedAt={updatedAt} createdAt={createdAt} navLayout={navLayout} />
    </div>
  );
}

type ItemInfoSectionsProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Stack of {@link ItemInfoSection}s. When sections include icons, connectors
 * draw a continuous vertical timeline between them.
 */
export function ItemInfoSections({ children, className }: ItemInfoSectionsProps) {
  return (
    <div data-slot="item-info-sections" className={cn("flex flex-col", className)}>
      {children}
    </div>
  );
}

type ItemInfoSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** Section heading + body, matching the review-card Summary / Highlights blocks. */
export function ItemInfoSection({
  title,
  icon,
  children,
  className,
  bodyClassName
}: ItemInfoSectionProps) {
  return (
    <section
      data-slot="item-info-section"
      className={cn("group/info-section relative min-w-0 not-last:pb-8", className)}
    >
      {icon ? (
        <div
          aria-hidden
          className="absolute top-5 bottom-0 left-2.5 w-px -translate-x-1/2 bg-border group-last/info-section:hidden"
        />
      ) : null}
      <div className="relative flex items-center gap-2.5">
        {icon ? (
          <span
            className="relative z-10 flex size-5 shrink-0 items-center justify-center bg-background text-muted-foreground [&_svg]:size-3.5"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <div
        className={cn(
          "relative mt-2.5 text-sm leading-relaxed text-muted-foreground",
          icon && "ps-7",
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function ItemInfoRow({
  icon,
  children,
  className
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2.5 text-sm leading-relaxed text-foreground", className)}>
      {icon ? (
        <span
          className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-3.5"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
