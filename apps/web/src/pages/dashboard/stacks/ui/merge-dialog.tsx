"use client";

import { Package } from "lucide-react";
import { useMemo, useState } from "react";

import { type StackOutput } from "@tsu-stack/core";
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
import { Label } from "@tsu-stack/ui/components/label";
import { Radio, RadioGroup } from "@tsu-stack/ui/components/radio-group";

import { Icon } from "@/shared/ui/icon";

type MergeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stacks: StackOutput[];
  onConfirm: (survivorId: string, victimIds: string[]) => void;
  isPending?: boolean;
};

export function MergeDialog({
  open,
  onOpenChange,
  stacks,
  onConfirm,
  isPending
}: MergeDialogProps) {
  const sorted = useMemo(
    () =>
      [...stacks].toSorted((a, b) => {
        const diff = (b.projectCount ?? 0) - (a.projectCount ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }),
    [stacks]
  );

  const [survivorId, setSurvivorId] = useState<string>(sorted[0]?.id ?? "");

  const survivor = stacks.find((s) => s.id === survivorId);
  const victims = stacks.filter((s) => s.id !== survivorId);

  function handleConfirm() {
    if (!survivorId || victims.length === 0) return;
    onConfirm(
      survivorId,
      victims.map((v) => v.id)
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge stacks</DialogTitle>
          <DialogDescription>
            All projects and dependencies from the victim stacks will be moved to the survivor. The
            victim stacks will be deleted.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={survivorId}
          onValueChange={setSurvivorId}
          aria-label="Choose survivor stack"
        >
          {sorted.map((s) => (
            <Label
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors has-data-checked:border-primary/50 has-data-checked:bg-primary/5"
            >
              <Radio value={s.id} />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {s.icon ? (
                  <Icon icon={s.icon} className="size-6 shrink-0 rounded object-contain" />
                ) : (
                  <Package className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  {s.projectCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {s.projectCount} {s.projectCount === 1 ? "project" : "projects"}
                    </p>
                  )}
                </div>
                {s.id === survivorId && (
                  <Badge variant="success" size="sm">
                    Survivor
                  </Badge>
                )}
              </div>
            </Label>
          ))}
        </RadioGroup>

        {survivor && victims.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            {victims.length} stack(s) will be merged into "{survivor.name}". All projects and
            dependencies will be moved.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!survivorId || victims.length === 0 || isPending}
            loading={isPending}
            onClick={handleConfirm}
          >
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
