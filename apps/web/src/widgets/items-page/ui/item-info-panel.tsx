import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ItemsInfoFooter } from "./items-info-footer";

type ItemInfoPanelProps = {
  title: string | React.ReactNode;
  /** Quiet meta row under the title (org, year, badges). */
  description?: string | React.ReactNode;
  /** Top-left mark, like the review-card glyph. */
  eyebrow?: React.ReactNode;
  /** Header trailing actions (Save, status, open). */
  actions?: React.ReactNode;
  headerClassName?: string;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
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
  actions,
  headerClassName,
  updatedAt,
  createdAt,
  className,
  children
}: ItemInfoPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className={cn("shrink-0 px-6 pt-5 pb-5 max-xl:pe-12", headerClassName)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/70 text-muted-foreground [&_img]:size-5 [&_svg]:size-4">
            {eyebrow ?? <span className="size-1.5 rounded-full bg-foreground/40" aria-hidden />}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
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
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1" scrollFade fill>
        <div className={cn("px-6 pb-8", className)}>{children}</div>
      </ScrollArea>
      <ItemsInfoFooter updatedAt={updatedAt} createdAt={createdAt} />
    </div>
  );
}

type ItemInfoSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Section heading + body, matching the review-card Summary / Highlights blocks. */
export function ItemInfoSection({ title, icon, children, className }: ItemInfoSectionProps) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span
            className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-3.5"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <div className={cn("mt-2.5 text-sm leading-relaxed text-muted-foreground", icon && "pl-7")}>
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
