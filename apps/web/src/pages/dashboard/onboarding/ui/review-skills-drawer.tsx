"use client";

import { type ResumeImportDraft, type ResumeImportStackDraft } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

const STACK_TYPE_ITEMS = [
  { value: "framework", label: "Framework" },
  { value: "language", label: "Language" },
  { value: "database", label: "Database" },
  { value: "ui", label: "UI" },
  { value: "auth", label: "Auth" },
  { value: "deployment", label: "Deployment" },
  { value: "testing", label: "Testing" },
  { value: "ai", label: "AI" },
  { value: "tooling", label: "Tooling" },
  { value: "storage", label: "Storage" },
  { value: "state management", label: "State Management" },
  { value: "other", label: "Other" }
] as const;

export type ReviewSkillsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ResumeImportDraft;
  onStackChange: (index: number, patch: Partial<ResumeImportStackDraft>) => void;
  onSetAllSelected: (selected: boolean) => void;
  onSetAllPortfolio: (includedInPortfolio: boolean) => void;
};

/**
 * Skills batch editor (grill Q4 lock): one drawer, checkbox + type + portfolio
 * switch per row. Text is never edited here — skill names/type live in the
 * draft as extracted; the below-lg editor still allows full editing.
 */
export function ReviewSkillsDrawer({
  open,
  onOpenChange,
  draft,
  onStackChange,
  onSetAllSelected,
  onSetAllPortfolio
}: ReviewSkillsDrawerProps) {
  const stacks = draft.stacks;
  const selectedCount = stacks.filter((s) => s.selected).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup
        side="right"
        variant="inset"
        className="flex w-full flex-col gap-0 sm:max-w-md"
        data-slot="review-skills-drawer"
      >
        <div className="flex flex-col gap-1.5 border-b border-border/70 px-4 py-4">
          <SheetTitle className="text-sm">Skills</SheetTitle>
          <SheetDescription className="text-xs">
            {selectedCount}/{stacks.length} confirmed — names and types were extracted from your
            resume; edit them later from Skills.
          </SheetDescription>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/30 px-4 py-2.5">
          <Group aria-label="Select all skills">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onSetAllSelected(true)}
            >
              All
            </Button>
            <GroupSeparator />
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onSetAllSelected(false)}
            >
              None
            </Button>
          </Group>
          {selectedCount > 0 ? (
            <Group aria-label="Portfolio for selected skills">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => onSetAllPortfolio(true)}
              >
                Show on portfolio
              </Button>
              <GroupSeparator />
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => onSetAllPortfolio(false)}
              >
                Hide
              </Button>
            </Group>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {stacks.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No skills extracted. They can be detected from GitHub later.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stacks.map((stack, index) => (
                <li
                  key={`${stack.name}-${index}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-[border-color,opacity,background-color] duration-150",
                    stack.selected
                      ? "border-border/80 bg-card"
                      : "border-border/40 bg-muted/10 opacity-70"
                  )}
                >
                  <Checkbox
                    checked={stack.selected}
                    aria-label={`Import ${stack.name || "skill"}`}
                    onCheckedChange={(v) => onStackChange(index, { selected: !!v })}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {stack.name || (
                      <span className="text-muted-foreground italic">Untitled skill</span>
                    )}
                  </span>
                  {stack.selected && stack.includedInPortfolio ? (
                    <Badge
                      variant="outline"
                      className="hidden h-5 px-1.5 text-[9px] sm:inline-flex"
                    >
                      portfolio
                    </Badge>
                  ) : null}
                  <Select
                    value={stack.type ?? ""}
                    disabled={!stack.selected}
                    onValueChange={(val) => {
                      onStackChange(index, {
                        type: typeof val === "string" && val.length > 0 ? val : null
                      });
                    }}
                    items={[
                      { value: "", label: "Type…" },
                      ...STACK_TYPE_ITEMS.map((t) => {
                        return { value: t.value, label: t.label };
                      })
                    ]}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`${stack.name} type`}
                      className="w-30 shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      <SelectList>
                        <SelectItem value="">Type…</SelectItem>
                        {STACK_TYPE_ITEMS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </Select>
                  <Switch
                    key={`drawer-pf-${index}-${stack.selected ? "s" : "u"}-${stack.includedInPortfolio ? "1" : "0"}`}
                    checked={stack.selected && stack.includedInPortfolio}
                    disabled={!stack.selected}
                    onCheckedChange={(v) => onStackChange(index, { includedInPortfolio: v })}
                    aria-label={`${stack.name} on portfolio`}
                    className="shrink-0 [--thumb-size:--spacing(3.5)]"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/70 px-4 py-3">
          <Button type="button" size="sm" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetPopup>
    </Sheet>
  );
}
