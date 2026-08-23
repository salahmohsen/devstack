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
   * Where tags sit in the text column next to `leading`.
   * - `before`: tags → title → meta
   * - `after` (default for jobs): title → meta → tags (badges under company)
   */
  tagsPlacement?: "before" | "after";
  /** Optional leading mark (avatar, icon, etc.). Sized to the identity stack (3 text rows). */
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
    <div className="no-scrollbar flex h-5 min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain">
      {tags.map((tag) => (
        <span key={tag.id} className="shrink-0">
          {renderTag(tag)}
        </span>
      ))}
    </div>
  );
}

function MetaRow({ meta }: { meta: ListItemMeta[] }) {
  if (meta.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm leading-5 text-muted-foreground">
      {meta.map((item) => {
        const Icon = item.icon;
        return (
          <span key={item.id} className="inline-flex max-w-full min-w-0 items-center gap-1.5">
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
  );
}

/**
 * Dashboard list-row content for {@link ListItem}: leading mark + stacked text rows.
 * With a leading mark, logo and text column share a 4.25rem identity stack so top/bottom
 * edges align (better-layout: align to shared edges).
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
  const showTags = tags.length > 0;
  const showMeta = meta.length > 0;

  // 3 × leading-5 (1.25rem) + 2 × gap-1 (0.25rem) = 4.25rem — logo matches the stack.
  const identityStackClass = "min-h-[4.25rem]";

  const textColumn = (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-center gap-1",
        leading && identityStackClass
      )}
    >
      {tagsBefore && showTags ? <TagsRow tags={tags} /> : null}
      <h3 className="min-w-0 truncate text-sm leading-5 font-medium">{title}</h3>
      {showMeta ? <MetaRow meta={meta} /> : null}
      {!tagsBefore && showTags ? <TagsRow tags={tags} /> : null}
    </div>
  );

  return (
    <ListItem {...listItemProps} className={className}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {leading ? (
          <div className="flex min-w-0 items-start gap-2.5">
            <div
              className={cn(
                "size-17 shrink-0",
                "*:data-[slot=item-avatar]:size-full! *:data-[slot=item-avatar]:max-h-none!"
              )}
            >
              {leading}
            </div>
            {textColumn}
          </div>
        ) : (
          textColumn
        )}
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
