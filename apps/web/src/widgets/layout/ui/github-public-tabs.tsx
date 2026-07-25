import { Link, type useRouter, useRouterState } from "@tanstack/react-router";
import {
  PlaySquare,
  Archive,
  ChevronRight,
  X,
  GitCommitHorizontal,
  GitPullRequest
} from "lucide-react";
import {
  type ComponentType,
  memo,
  type SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { parseRepoTabLocation } from "@/shared/lib/repo-paths";
import { preloadRouteOnce } from "@/shared/lib/route-preload";
import {
  removeOtherTabs,
  removeTab,
  removeTabsToRight,
  reorderTabs,
  type Tab,
  useTabs
} from "@/shared/lib/tab-store";

import { IssuesIcon, ReviewsIcon } from "@/lib/command-palette-icons";

const tabIconMap = {
  pull: GitPullRequest,
  issue: IssuesIcon,
  review: ReviewsIcon,
  repo: Archive,
  commit: GitCommitHorizontal,
  actions: PlaySquare
} as const;

function useScrollShadows(tabCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTabCountRef = useRef(tabCount);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (tabCount > prevTabCountRef.current) {
      el.scrollLeft = el.scrollWidth;
    }
    prevTabCountRef.current = tabCount;
    updateScrollState();

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabCount, updateScrollState]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = scrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
      updateScrollState();
    },
    [updateScrollState]
  );

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    updateScrollState,
    handleWheel
  };
}

type TabsProps = {
  tabsReady: boolean;
  routerRef: React.RefObject<ReturnType<typeof useRouter>>;
};

export function Tabs({ tabsReady, routerRef }: TabsProps) {
  const openTabs = useTabs();
  const dragTabRef = useRef<string | null>(null);
  const [contextTab, setContextTab] = useState<{
    tab: Tab;
    index: number;
  } | null>(null);
  const { scrollRef, canScrollLeft, canScrollRight, updateScrollState, handleWheel } =
    useScrollShadows(openTabs.length);

  const handleDragStart = useCallback((id: string) => {
    dragTabRef.current = id;
  }, []);

  const handleDragOver = useCallback(
    (targetId: string) => {
      const dragId = dragTabRef.current;
      if (!dragId || dragId === targetId) return;
      const fromIndex = openTabs.findIndex((t) => t.id === dragId);
      const toIndex = openTabs.findIndex((t) => t.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...openTabs];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      reorderTabs(next);
    },
    [openTabs]
  );

  const handleDragEnd = useCallback(() => {
    dragTabRef.current = null;
  }, []);

  const navigateToTabUrl = useCallback(
    (url: string) => {
      const location = parseRepoTabLocation(url);
      if (location) {
        void routerRef.current.navigate({
          to: location.to,
          params: location.params
        } as never);
        return;
      }
      void routerRef.current.navigate({ to: url as never });
    },
    [routerRef]
  );

  const handleCloseTab = useCallback(
    (id: string, tabUrl: string) => {
      const currentPath = routerRef.current.state.location.pathname;
      const isActive = currentPath === tabUrl;
      const index = openTabs.findIndex((tab) => tab.id === id);
      const nextTab = index === -1 ? undefined : (openTabs[index + 1] ?? openTabs[index - 1]);
      removeTab(id);
      if (isActive) {
        if (nextTab) {
          navigateToTabUrl(nextTab.url);
        } else {
          void routerRef.current.navigate({ to: "/" });
        }
      }
    },
    [navigateToTabUrl, openTabs, routerRef]
  );

  const handleContextClose = useCallback(() => {
    if (!contextTab) return;
    handleCloseTab(contextTab.tab.id, contextTab.tab.url);
  }, [contextTab, handleCloseTab]);

  const handleContextCloseOthers = useCallback(() => {
    if (!contextTab) return;
    const currentPath = routerRef.current.state.location.pathname;
    if (currentPath !== contextTab.tab.url) {
      navigateToTabUrl(contextTab.tab.url);
    }
    removeOtherTabs(contextTab.tab.id);
  }, [contextTab, navigateToTabUrl]);

  const handleContextCloseRight = useCallback(() => {
    if (!contextTab) return;
    removeTabsToRight(contextTab.tab.id);
  }, [contextTab]);

  // const handleContextCloseMerged = useCallback(() => {
  //   const currentPath = routerRef.current.state.location.pathname;
  //   const activeTabWillClose = openTabs.find((t) => currentPath === t.url && isMergedTab(t));
  //   removeMergedTabs();
  //   if (activeTabWillClose) {
  //     const remaining = openTabs.filter((t) => !isMergedTab(t));
  //     void routerRef.current.navigate({
  //       to: remaining[0]?.url ?? ("/" as never)
  //     });
  //   }
  // }, [openTabs, routerRef]);

  if (openTabs.length === 0) return null;

  return (
    <div
      aria-hidden={!tabsReady}
      className={cn(
        "flex min-w-0 items-center gap-3 overflow-hidden transition-[opacity,transform] duration-300 ease-out",
        tabsReady ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-0.5 opacity-0"
      )}
    >
      <div className="hidden h-4 shrink-0 border-l border-border md:block" />
      <ContextMenu>
        {/* Base UI trigger must grow in the topbar flex row (Diffkit used asChild).
            Without min-w-0 flex-1 the tab strip collapses to 0 width. */}
        <ContextMenuTrigger className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-background to-transparent transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-background to-transparent transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />
          {/* biome-ignore lint/a11y/noStaticElementInteractions: scroll container needs onScroll for gradient visibility */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            onWheel={handleWheel}
            onMouseEnter={updateScrollState}
            className="no-scrollbar flex w-0 min-w-full items-center gap-0.5 overflow-x-auto"
          >
            <ScrollActiveTabIntoView scrollRef={scrollRef} updateScrollState={updateScrollState} />
            {openTabs.map((tab, index) => {
              const Icon = tabIconMap[tab.type];
              return (
                <DetailTab
                  key={tab.id}
                  tab={tab}
                  icon={Icon}
                  onClose={handleCloseTab}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onContextMenu={() => {
                    setContextTab({ tab, index });
                  }}
                  routerRef={routerRef}
                />
              );
            })}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleContextClose}>
            <X size={14} strokeWidth={2} />
            Close
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleContextCloseOthers} disabled={openTabs.length <= 1}>
            <X size={14} strokeWidth={2} />
            Close other tabs
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={handleContextCloseRight}
            disabled={!contextTab || contextTab.index === openTabs.length - 1}
          >
            <ChevronRight size={14} strokeWidth={2} />
            Close tabs to the right
          </ContextMenuItem>
          {/* <ContextMenuItem onSelect={handleContextCloseMerged} disabled={!hasMergedTabs}>
            <GitPullRequest size={14} strokeWidth={2} />
            Close merged
          </ContextMenuItem> */}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

/**
 * Isolated component that subscribes to pathname changes to scroll the active
 * tab into view. Extracted so the parent Tabs doesn't re-render on
 * every navigation — only this tiny renderless component does.
 */
function ScrollActiveTabIntoView({
  scrollRef,
  updateScrollState
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  updateScrollState: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers scroll-into-view on route change
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeTab = container.querySelector<HTMLElement>(".active");
    if (!activeTab) return;

    const { left: cLeft, right: cRight } = container.getBoundingClientRect();
    const { left: tLeft, right: tRight } = activeTab.getBoundingClientRect();

    if (tLeft < cLeft || tRight > cRight) {
      activeTab.scrollIntoView({ inline: "nearest", block: "nearest" });
      updateScrollState();
    }
  }, [pathname, scrollRef, updateScrollState]);

  return null;
}

const DetailTab = memo(function DetailTab({
  tab,
  icon: Icon,
  onClose,
  onDragStart,
  onDragOver,
  onDragEnd,
  onContextMenu,
  routerRef
}: {
  tab: Tab;
  icon:
    | typeof GitPullRequest
    | ComponentType<
        SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number }
      >;
  onClose: (id: string, tabUrl: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onContextMenu: () => void;
  routerRef: React.RefObject<ReturnType<typeof useRouter>>;
}) {
  const location = parseRepoTabLocation(tab.url);
  const preloadTab = () => {
    if (!location) return;
    void preloadRouteOnce(routerRef.current, location.to);
  };

  const children = (
    <>
      {tab.avatarUrl ? (
        <img src={tab.avatarUrl} alt="" className="size-3.5 shrink-0 rounded-sm" />
      ) : (
        <Icon size={13} strokeWidth={2} className={cn("shrink-0", tab.iconColor)} />
      )}
      <span className="max-w-32 min-w-13 truncate">{tab.title}</span>
      {tab.type === "review" || tab.type === "commit" ? (
        <span className="flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums">
          {tab.additions != null && <span>+{tab.additions}</span>}
          {tab.deletions != null && <span>-{tab.deletions}</span>}
        </span>
      ) : tab.number != null ? (
        <span className="text-[11px] text-muted-foreground tabular-nums">#{tab.number}</span>
      ) : null}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose(tab.id, tab.url);
        }}
        className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-sm md:hidden"
        aria-label={`Close ${tab.title}`}
      >
        <X size={12} strokeWidth={2} className="text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose(tab.id, tab.url);
        }}
        className="absolute inset-y-0 right-0 hidden items-center rounded-r-sm bg-background pr-1.5 pl-1.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        aria-label={`Close ${tab.title}`}
      >
        <span className="absolute inset-y-0 -left-3 w-3 bg-linear-to-r from-transparent to-background" />
        <span className="relative flex size-4 items-center justify-center rounded-sm hover:bg-muted">
          <X size={10} strokeWidth={2} />
        </span>
      </button>
    </>
  );

  const shared = {
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      onDragStart(tab.id);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOver(tab.id);
    },
    onDragEnd,
    preload: false as const,
    onMouseEnter: preloadTab,
    onFocus: preloadTab,
    onTouchStart: preloadTab,
    onContextMenu,
    activeOptions: { exact: true } as const,
    activeProps: { className: "active" },
    className:
      "group relative flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground [&.active]:ring-1 [&.active]:ring-border"
  };

  if (location) {
    return (
      <Link to={location.to} params={location.params as never} {...shared}>
        {children}
      </Link>
    );
  }

  return (
    <Link to={tab.url as never} {...shared}>
      {children}
    </Link>
  );
});
