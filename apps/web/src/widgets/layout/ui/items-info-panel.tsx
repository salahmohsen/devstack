import { SidePanelPortal } from "@/widgets/layout";

type ItemsInfoPanelProps<T> = {
  /** When false, nothing renders and the side panel slot collapses. */
  open: boolean;
  /** The currently selected item (or null when nothing is selected). */
  item: T | null;
  children: (item: T) => React.ReactNode;
};

/**
 * Renders content into the dashboard's <SidePanelPortal>.
 *
 * When `open` is false, nothing is rendered and the portal's slot
 * auto-collapses via the `SidePanelSlot` MutationObserver.
 */
export function ItemsInfoPanel<T>({ open, item, children }: ItemsInfoPanelProps<T>) {
  if (!open || !item) return null;
  return <SidePanelPortal>{children(item)}</SidePanelPortal>;
}
