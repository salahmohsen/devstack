import { Fragment, useMemo } from "react";

import {
  formatStackTypeLabel,
  normalizeStackType,
  STACK_TYPE_ORDER,
  type StackOutput
} from "@tsu-stack/core";

import { useGetPortfolioListQuery } from "@/features/portfolio";

import { StackChipMarqueeRow } from "@/pages/home-page/ui/stack-chip-marquee";

type FeaturedTypeGroup = {
  type: string;
  label: string;
  stacks: StackOutput[];
};

function groupFeaturedStacksByType(stacks: StackOutput[]): FeaturedTypeGroup[] {
  const byType = new Map<string, StackOutput[]>();
  for (const stack of stacks) {
    const type = normalizeStackType(stack.type);
    const list = byType.get(type) ?? [];
    list.push(stack);
    byType.set(type, list);
  }

  const groups: FeaturedTypeGroup[] = [];
  const seen = new Set<string>();

  const push = (type: string) => {
    const list = byType.get(type);
    if (!list?.length) return;
    seen.add(type);
    groups.push({
      type,
      label: formatStackTypeLabel(type),
      stacks: [...list].toSorted(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    });
  };

  for (const type of STACK_TYPE_ORDER) push(type);
  for (const type of byType.keys()) {
    if (!seen.has(type)) push(type);
  }
  return groups;
}

export function FeaturedStacksSection({ username }: { username: string }) {
  const portfolioQuery = useGetPortfolioListQuery(username);
  const featured = useMemo(
    () => (portfolioQuery.data?.stacks ?? []).filter((stack) => stack.isFeatured),
    [portfolioQuery.data?.stacks]
  );
  const groups = useMemo(() => groupFeaturedStacksByType(featured), [featured]);

  if (groups.length === 0) return null;

  return (
    <section
      id="stacks"
      data-slot="panel"
      className="screen-line-bottom"
      aria-label="Featured stacks"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-2.5">
        {groups.map((group, index) => (
          <Fragment key={group.type}>
            <p className="font-mono text-[0.65rem] leading-none font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
              {group.label}
            </p>
            <StackChipMarqueeRow stacks={group.stacks} reverse={index % 2 === 1} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
