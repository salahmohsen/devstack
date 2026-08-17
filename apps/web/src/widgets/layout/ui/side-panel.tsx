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

// w-72 (288px) + pl-2 (8px)
export const PUBLIC_SIDE_PANEL_WIDTH = 320;
export const DASHBOARD_SIDE_PANEL_WIDTH = 560;

type SidePanelState = {
  node: HTMLDivElement | null;
  collapsed: boolean;
  hasContent: boolean;
  /** True as soon as a portal mounts (before MutationObserver). */
  inspectOpen: boolean;
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
    inspectCountRef.current = 0;
    setInspectOpen(false);
    dismissDashboardSidePanel();
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
