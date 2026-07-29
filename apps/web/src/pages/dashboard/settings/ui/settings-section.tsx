import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

type SettingsSectionProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Domain-style section block for settings content (title + optional action + body).
 * Prefer this over nested Frames inside a page Frame.
 */
export function SettingsSection({
  title,
  description,
  action,
  children,
  className
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
