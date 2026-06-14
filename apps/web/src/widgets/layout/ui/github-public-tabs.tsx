import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type SVGProps
} from "react";

import { getLocale } from "@tsu-stack/i18n/runtime";
import {
  ActionsIcon,
  ArchiveIcon,
  ChevronRightIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  IssuesIcon,
  PanelRightCloseIcon,
  ReviewsIcon,
  XIcon
} from "@tsu-stack/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { preloadRouteOnce } from "@/shared/lib/route-preload";
import {
  removeOtherTabs,
  removeTab,
  removeTabsToRight,
  reorderTabs,
  useTabs,
  type Tab
} from "@/shared/lib/tab-store";

const tabIconMap = {
  pull: GitPullRequestIcon,
  issue: IssuesIcon,
  review: ReviewsIcon,
  repo: ArchiveIcon,
  commit: GitCommitIcon,
  actions: ActionsIcon
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

export function Tabs() {
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const openTabs = useTabs();
  const dragTabRef = useRef<string | null>(null);
  const [contextTab, setContextTab] = useState<{
    tab: Tab;
    index: number;
  } | null>(null);
  const { scrollRef, canScrollLeft, canScrollRight, updateScrollState, handleWheel } =
    useScrollShadows(openTabs.length);
  const rootHref = getLocale() ? `/${getLocale()}` : "/";

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

  const handleCloseTab = useCallback(
    (id: string, tabUrl: string) => {
      const currentPath = routerRef.current.state.location.pathname;
      const isActive = currentPath === tabUrl;
      const index = openTabs.findIndex((tab) => tab.id === id);
      const nextTab = index === -1 ? undefined : (openTabs[index + 1] ?? openTabs[index - 1]);
      removeTab(id);
      if (isActive) {
        void routerRef.current.navigate({ to: nextTab?.url ?? ("/" as never) });
      }
    },
    [openTabs, routerRef]
  );

  const handleContextClose = useCallback(() => {
    if (!contextTab) return;
    handleCloseTab(contextTab.tab.id, contextTab.tab.url);
  }, [contextTab, handleCloseTab]);

  const handleContextCloseOthers = useCallback(() => {
    if (!contextTab) return;
    const currentPath = routerRef.current.state.location.pathname;
    if (currentPath !== contextTab.tab.url) {
      void routerRef.current.navigate({ to: contextTab.tab.url as never });
    }
    removeOtherTabs(contextTab.tab.id);
  }, [contextTab, routerRef]);

  const handleContextCloseRight = useCallback(() => {
    if (!contextTab) return;
    removeTabsToRight(contextTab.tab.id);
  }, [contextTab]);

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      {openTabs.length > 0 ? (
        <>
          <div className="hidden h-4 shrink-0 border-l border-white/10 md:block" />
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-[#0d1117] to-transparent transition-opacity",
                    canScrollLeft ? "opacity-100" : "opacity-0"
                  )}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-[#0d1117] to-transparent transition-opacity",
                    canScrollRight ? "opacity-100" : "opacity-0"
                  )}
                />
                <div
                  ref={scrollRef}
                  onScroll={updateScrollState}
                  onWheel={handleWheel}
                  onMouseEnter={updateScrollState}
                  className="no-scrollbar flex w-0 min-w-full items-center gap-0.5 overflow-x-auto"
                >
                  <ScrollActiveTabIntoView
                    scrollRef={scrollRef}
                    updateScrollState={updateScrollState}
                  />
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
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={handleContextClose}>
                <XIcon size={14} />
                Close
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleContextCloseOthers} disabled={openTabs.length <= 1}>
                <PanelRightCloseIcon size={14} />
                Close other tabs
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={handleContextCloseRight}
                disabled={!contextTab || contextTab.index === openTabs.length - 1}
              >
                <ChevronRightIcon size={14} />
                Close tabs to the right
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </>
      ) : null}
    </div>
  );
}

function ScrollActiveTabIntoView({
  scrollRef,
  updateScrollState
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  updateScrollState: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    | typeof GitPullRequestIcon
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
  const preloadTab = () => {
    void preloadRouteOnce(routerRef.current, tab.url);
  };

  return (
    <Link
      to={tab.url as never}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(tab.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(tab.id);
      }}
      onDragEnd={onDragEnd}
      preload={false}
      onMouseEnter={preloadTab}
      onFocus={preloadTab}
      onTouchStart={preloadTab}
      onContextMenu={onContextMenu}
      activeOptions={{ exact: true }}
      activeProps={{ className: "active" }}
      className="group relative flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/4 px-3 text-xs font-medium text-base-300 transition-colors hover:bg-white/9 hover:text-white [&.active]:bg-white/[0.14] [&.active]:text-white [&.active]:ring-1 [&.active]:ring-white/10"
    >
      {tab.avatarUrl ? (
        <img src={tab.avatarUrl} alt="" className="size-3.5 shrink-0 rounded-sm" />
      ) : (
        <Icon size={13} strokeWidth={2} className="shrink-0" />
      )}
      <span className="max-w-32 truncate">{tab.title}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose(tab.id, tab.url);
        }}
        className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md md:hidden"
        aria-label={`Close ${tab.title}`}
      >
        <XIcon size={12} className="text-base-400" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose(tab.id, tab.url);
        }}
        className="absolute inset-y-0 right-0 hidden items-center rounded-r-full bg-white/6 pr-1.5 pl-1.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex"
        aria-label={`Close ${tab.title}`}
      >
        <span className="absolute inset-y-0 -left-3 w-3 bg-linear-to-r from-transparent to-white/6" />
        <span className="relative flex size-4 items-center justify-center rounded-sm hover:bg-white/10">
          <XIcon size={10} />
        </span>
      </button>
    </Link>
  );
});
