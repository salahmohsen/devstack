import { Loader2Icon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

type SettingsSaveBarProps = {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saveLabel?: string;
  className?: string;
};

/**
 * Sticky dirty-state bar for multi-field settings forms (AI, Notifications).
 * Hidden when clean.
 */
export function SettingsSaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  className
}: SettingsSaveBarProps) {
  if (!dirty) return null;

  return (
    <output
      className={cn(
        "sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-card/95 px-1 py-3 backdrop-blur supports-backdrop-filter:bg-card/80 md:-mx-2 md:px-2",
        className
      )}
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Unsaved changes</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>
          {saving ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </div>
    </output>
  );
}
