import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";

type ItemsInfoSheetProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: T | null;
  /** Accessible title (visible chrome lives in ItemInfoPanel). */
  title: string;
  /** Accessible description. */
  description?: string;
  children: (item: T) => React.ReactNode;
};

/**
 * Mobile fallback for the dashboard side panel: inset right Sheet.
 */
export function ItemsInfoSheet<T>({
  open,
  onOpenChange,
  item,
  title,
  description,
  children
}: ItemsInfoSheetProps<T>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="w-full sm:max-w-lg" side="right" showCloseButton variant="inset">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {description ? (
          <SheetDescription className="sr-only">{description}</SheetDescription>
        ) : null}
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {open && item ? children(item) : null}
        </div>
      </SheetPopup>
    </Sheet>
  );
}
