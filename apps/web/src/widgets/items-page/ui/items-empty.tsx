import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { cn } from "@tsu-stack/ui/lib/utils";

type ItemsEmptyProps = {
  title: string;
  description?: string;
  /** Lucide (or other) icon rendered in `EmptyMedia variant="icon"`. */
  icon?: React.ReactNode;
  /** Primary recovery actions — always place buttons here, not in the header. */
  action?: React.ReactNode;
  className?: string;
};

/**
 * Standard empty state for dashboard listings.
 *
 * Uses coss Empty composition: media icon → title/description → action content.
 * Prefer this over ad-hoc copy so every list shares the same recovery pattern.
 */
export function ItemsEmpty({ title, description, icon, action, className }: ItemsEmptyProps) {
  return (
    <Empty className={cn("min-h-0", className)}>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
