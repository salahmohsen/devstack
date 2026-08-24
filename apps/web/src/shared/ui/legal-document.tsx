import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Legal / policy document chrome aligned with the public portfolio layout:
 * max-w-3xl screen-rails, screen-line header band, muted section labels.
 */
export function LegalDocument({
  title,
  effectiveDate,
  children,
  className
}: {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full min-w-0 overflow-x-clip pb-16", className)}>
      <div className="screen-rails mx-auto w-full max-w-3xl">
        <header className="screen-line-bottom flex flex-col gap-1.5 px-4 pt-10 pb-4 sm:pt-12">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {effectiveDate ? (
            <p className="text-sm text-muted-foreground">Effective as of {effectiveDate}</p>
          ) : null}
        </header>

        <div
          className={cn(
            "legal-doc px-4 pt-8 pb-4",
            "text-sm leading-relaxed text-foreground",
            // Body copy
            "[&_p]:mb-4 [&_p]:text-pretty [&_p]:text-muted-foreground [&_p:last-child]:mb-0",
            // Section titles — same weight/role as portfolio Experience / Projects labels
            "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:text-foreground",
            "[&_h2:first-child]:mt-0",
            // Subheads
            "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground",
            // Lists
            "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-muted-foreground",
            "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:text-muted-foreground",
            "[&_li]:leading-relaxed",
            // Emphasis + links
            "[&_strong]:font-medium [&_strong]:text-foreground",
            "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground/80",
            // Drop MDX thematic breaks — spacing comes from h2 margins
            "[&_hr]:my-0 [&_hr]:hidden"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
