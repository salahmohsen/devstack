import { type OrganizeAction } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import { Icon } from "@/shared/ui/icon";

const TYPE_LABELS: Record<string, string> = {
  framework: "Framework",
  language: "Language",
  database: "Database",
  ui: "UI",
  auth: "Auth",
  deployment: "Deploy",
  testing: "Testing",
  ai: "AI",
  tooling: "Tooling",
  storage: "Storage",
  other: "Other"
};

type OrganizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: OrganizeAction[];
  sortOrder: string[];
  isPending: boolean;
  onConfirm: () => void;
  onClearSortOrder: () => void;
};

export function OrganizeDialog({
  open,
  onOpenChange,
  actions,
  sortOrder,
  isPending,
  onConfirm,
  onClearSortOrder
}: OrganizeDialogProps) {
  function handleClose() {
    onOpenChange(false);
    onClearSortOrder();
  }

  const isEmpty = actions.length === 0 && sortOrder.length === 0;

  const confirmLabel = isPending
    ? "Applying..."
    : sortOrder.length > 0
      ? `Apply ${sortOrder.length} reorder${sortOrder.length !== 1 ? "s" : ""}${actions.length > 0 ? ` + ${actions.length} change${actions.length !== 1 ? "s" : ""}` : ""}`
      : `Apply ${actions.length} action${actions.length !== 1 ? "s" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="form-dialog">
        <DialogHeader>
          <DialogTitle>Organize Stacks</DialogTitle>
          <DialogDescription>
            The following actions will be applied to your stacks. Review and confirm to proceed.
          </DialogDescription>
        </DialogHeader>

        {actions.length > 0 && (
          <div className="max-h-100 space-y-2 overflow-y-auto">
            {actions.map((action) => (
              <div
                key={`${action.type}-${action.stackId}`}
                className="flex items-start gap-3 rounded-md border border-border/60 p-3"
              >
                <Badge
                  variant={
                    action.type === "merge"
                      ? "destructive"
                      : action.type === "rename"
                        ? "warning"
                        : "success"
                  }
                  size="sm"
                >
                  {action.type}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{action.stackName}</p>
                  <p className="text-xs text-muted-foreground">{action.reason}</p>
                  {action.type === "merge" && (
                    <p className="text-xs text-muted-foreground">
                      → Merging into "
                      {String((action.details.mergeIntoName as string) ?? "unknown")}"
                    </p>
                  )}
                  {action.type === "rename" && (
                    <p className="text-xs text-muted-foreground">
                      → Renaming to "{String((action.details.newName as string) ?? "unknown")}"
                    </p>
                  )}
                  {action.type === "enrich" && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {(action.details.newType as string) && (
                        <Badge variant={"outline"} size="sm">
                          {String(
                            TYPE_LABELS[String(action.details.newType)] ?? action.details.newType
                          )}
                        </Badge>
                      )}
                      {(action.details.newIcon as string) && (
                        <Icon
                          icon={String(action.details.newIcon)}
                          className="size-5 shrink-0 rounded object-contain"
                        />
                      )}
                      {(action.details.newDescription as string) && (
                        <p className="line-clamp-2 w-full text-xs text-muted-foreground">
                          {String(action.details.newDescription)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={isPending || isEmpty} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
