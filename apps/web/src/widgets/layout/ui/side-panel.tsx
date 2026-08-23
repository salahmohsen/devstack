import { ChevronRight } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import {
  dismissDashboardSidePanel,
  subscribeSidePanelExpand
} from "@/shared/lib/side-panel-control";

import {
  clampDashboardSidePanelWidth,
  DASHBOARD_SIDE_PANEL_MAX_WIDTH,
  DASHBOARD_SIDE_PANEL_MIN_WIDTH,
  DASHBOARD_SIDE_PANEL_WIDTH,
  readStoredDashboardSidePanelWidth,
  writeStoredDashboardSidePanelWidth
} from "@/widgets/layout/lib/side-panel-width";

// w-72 (288px) + pl-2 (8px)
export const PUBLIC_SIDE_PANEL_WIDTH = 320;
export {
  DASHBOARD_SIDE_PANEL_MAX_WIDTH,
  DASHBOARD_SIDE_PANEL_MIN_WIDTH,
  DASHBOARD_SIDE_PANEL_WIDTH
};

type SidePanelState = {
  node: HTMLDivElement | null;
  collapsed: boolean;
  hasContent: boolean;
  /** True as soon as a portal mounts (before MutationObserver). */
  inspectOpen: boolean;
  /** Live xl+ panel column width (px), including during resize. */
  width: number;
  requestInspectOpen: () => void;
  releaseInspectOpen: () => void;
  /** Hide-only (legacy). Prefer `close` so inspect state unmounts. */
  toggle: () => void;
  /** Unmount inspect content and reset collapse. */
  close: () => void;
};

const SidePanelContext = createContext<SidePanelState>({
  node: null,
  collapsed: false,
  hasContent: false,
  inspectOpen: false,
  width: DASHBOARD_SIDE_PANEL_WIDTH,
  requestInspectOpen: () => {},
  releaseInspectOpen: () => {},
  toggle: () => {},
  close: () => {}
});

export function useSidePanelSlot() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const inspectCountRef = useRef(0);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const requestInspectOpen = useCallback(() => {
    inspectCountRef.current += 1;
    setInspectOpen(true);
    setCollapsed(false);
  }, []);
  const releaseInspectOpen = useCallback(() => {
    inspectCountRef.current = Math.max(0, inspectCountRef.current - 1);
    if (inspectCountRef.current === 0) setInspectOpen(false);
  }, []);
  const close = useCallback(() => {
    setCollapsed(false);
    // Form guards may consume dismiss (dirty confirm) — keep inspect open.
    if (dismissDashboardSidePanel()) return;
    inspectCountRef.current = 0;
    setInspectOpen(false);
  }, []);
  useEffect(() => subscribeSidePanelExpand(() => setCollapsed(false)), []);
  return {
    node,
    setNode,
    collapsed,
    hasContent,
    setHasContent,
    inspectOpen,
    requestInspectOpen,
    releaseInspectOpen,
    toggle,
    close
  } as const;
}

/** Read the layout side-panel slot (collapse + whether inspect content is mounted). */
export function useSidePanel() {
  return useContext(SidePanelContext);
}

export function SidePanelProvider({
  value,
  children
}: {
  value: SidePanelState;
  children: React.ReactNode;
}) {
  return <SidePanelContext value={value}>{children}</SidePanelContext>;
}

export function SidePanelPortal({ children }: { children: React.ReactNode }) {
  const { node, requestInspectOpen, releaseInspectOpen } = useContext(SidePanelContext);

  useLayoutEffect(() => {
    requestInspectOpen();
    return () => releaseInspectOpen();
  }, [requestInspectOpen, releaseInspectOpen]);

  if (!node) return null;
  return createPortal(children, node);
}

export function SidePanelSlot({
  slotRef,
  collapsed,
  onHasContent
}: {
  slotRef: (el: HTMLDivElement | null) => void;
  collapsed: boolean;
  onHasContent: (v: boolean) => void;
}) {
  const [hasChildren, setHasChildren] = useState(false);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      slotRef(el);
    },
    [slotRef]
  );

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const check = () => {
      const has = el.childNodes.length > 0;
      setHasChildren(has);
      onHasContent(has);
    };

    check();
    const observer = new MutationObserver(() => {
      const has = el.childNodes.length > 0;
      if (has && ghostRef.current) {
        ghostRef.current.replaceChildren();
        if (exitTimer.current) clearTimeout(exitTimer.current);
      }
      setHasChildren(has);
      onHasContent(has);
    });
    observer.observe(el, { childList: true });
    el.addEventListener("sidepanel-content", check);
    return () => {
      observer.disconnect();
      el.removeEventListener("sidepanel-content", check);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, [onHasContent]);

  // Stay fully opaque while the shell collapses (`collapsed`). The root layout
  // clips via overflow + width layout animation; fading out here made content
  // vanish before that spring finished. Only fade when portal children are gone.
  const { inspectOpen } = useContext(SidePanelContext);
  const painted = hasChildren || inspectOpen;

  return (
    <div
      className="hidden h-full min-h-0 overflow-hidden xl:block"
      style={{ pointerEvents: collapsed || !painted ? "none" : "auto" }}
    >
      <div ref={refCallback} className="h-full min-h-0" />
      <div ref={ghostRef} className="pointer-events-none" aria-hidden />
    </div>
  );
}

export function SidePanelToggle() {
  const { close, hasContent, inspectOpen } = useContext(SidePanelContext);
  if (!hasContent && !inspectOpen) return null;

  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close details panel"
      className="absolute top-14 right-0 hidden -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 bg-background py-2.5 pr-1 pl-0.5 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground xl:flex"
    >
      <ChevronRight size={12} strokeWidth={2} />
    </button>
  );
}

/** Remembered width for the xl+ dashboard / public-repos inspect column. */
export function useDashboardSidePanelWidth() {
  const [width, setWidth] = useState(DASHBOARD_SIDE_PANEL_WIDTH);

  useEffect(() => {
    setWidth(readStoredDashboardSidePanelWidth());
  }, []);

  const setLiveWidth = useCallback((px: number) => {
    setWidth(clampDashboardSidePanelWidth(px));
  }, []);

  const commitWidth = useCallback((px: number) => {
    const next = clampDashboardSidePanelWidth(px);
    setWidth(next);
    writeStoredDashboardSidePanelWidth(next);
  }, []);

  return { width, setLiveWidth, commitWidth } as const;
}

/**
 * Left-edge drag handle (panel sits on the right). Drag left to widen —
 * same pointer pattern as `Sidebar001`, mirrored.
 */
export function SidePanelResizeHandle({
  width,
  onWidthChange,
  onWidthCommit
}: {
  width: number;
  onWidthChange: (px: number) => void;
  onWidthCommit: (px: number) => void;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [width]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      // Handle is on the left edge: moving left increases width.
      const next = clampDashboardSidePanelWidth(startW.current + (startX.current - e.clientX));
      onWidthChange(next);
    },
    [onWidthChange]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    onWidthCommit(widthRef.current);
  }, [onWidthCommit]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize details panel"
      aria-valuemin={DASHBOARD_SIDE_PANEL_MIN_WIDTH}
      aria-valuemax={DASHBOARD_SIDE_PANEL_MAX_WIDTH}
      aria-valuenow={width}
      className="group/handle absolute top-0 left-0 z-20 h-full w-1 cursor-col-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute top-0 left-0 h-full w-px bg-transparent transition-colors duration-150 group-hover/handle:bg-border" />
    </div>
  );
}
