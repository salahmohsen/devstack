"use client";

import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@tsu-stack/ui/components/badge";
import { TruncatedText } from "@tsu-stack/ui/components/truncated-text";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ListItem } from "@/shared/ui/list-item";

export type ListItemTag =
  | {
      id: string;
      /** Pre-built badge/node — rendered as-is. */
      node: ReactNode;
      label?: never;
    }
  | {
      id: string;
      label: ReactNode;
      node?: never;
      variant?: React.ComponentProps<typeof Badge>["variant"];
      size?: React.ComponentProps<typeof Badge>["size"];
      className?: string;
      title?: string;
    };

export type ListItemMeta = {
  id: string;
  icon: LucideIcon;
  text: string;
};

type ListItemPassthrough = Omit<
  React.ComponentProps<typeof ListItem>,
  "children" | "title" | "titleStart" | "titleEnd" | "meta"
>;

export type ListItemContentProps = ListItemPassthrough & {
  title: string;
  tags?: ListItemTag[];
  meta?: ListItemMeta[];
  /**
   * Where tags sit relative to the title.
   * - `before` (default): status chips above the identity row (jobs).
   * - `after`: title first, then chips under it (projects).
   */
  tagsPlacement?: "before" | "after";
  /** Optional leading mark (avatar, icon, etc.). */
  leading?: ReactNode;
  /** Optional actions row under the identity block (typically mobile). */
  mobileActions?: ReactNode;
};

function renderTag(tag: ListItemTag): ReactNode {
  if ("node" in tag) return tag.node;
  return (
    <Badge
      variant={tag.variant ?? "secondary"}
      size={tag.size ?? "xs"}
      className={cn("shrink-0 font-normal tracking-normal normal-case", tag.className)}
      title={tag.title}
    >
      {tag.label}
    </Badge>
  );
}

function TagsRow({ tags }: { tags: ListItemTag[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="no-scrollbar flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain">
      {tags.map((tag) => (
        <span key={tag.id} className="shrink-0">
          {renderTag(tag)}
        </span>
      ))}
    </div>
  );
}

/**
 * Dashboard list-row content for {@link ListItem}: tags + leading + title/meta.
 * Domain pages pass tags, meta, leading, and actions; this owns the layout only.
 */
export function ListItemContent({
  title,
  tags = [],
  meta = [],
  tagsPlacement = "before",
  leading,
  mobileActions,
  className,
  ...listItemProps
}: ListItemContentProps) {
  const tagsBefore = tagsPlacement === "before";

  return (
    <ListItem
      {...listItemProps}
      className={cn(listItemProps.selected && "border-primary/40", className)}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {tagsBefore ? <TagsRow tags={tags} /> : null}
        <div className="flex min-w-0 items-center gap-2.5">
          {leading}
          <div className="min-w-0 flex-1">
            <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
            {!tagsBefore && tags.length > 0 ? (
              <div className="mt-1.5">
                <TagsRow tags={tags} />
              </div>
            ) : null}
            {meta.length > 0 ? (
              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                {meta.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.id}
                      className="inline-flex max-w-full min-w-0 items-center gap-1.5"
                    >
                      <Icon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <TruncatedText>{item.text}</TruncatedText>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
        {mobileActions ? (
          <div
            role="presentation"
            className="mt-0.5 md:hidden"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {mobileActions}
          </div>
        ) : null}
      </div>
    </ListItem>
  );
}
