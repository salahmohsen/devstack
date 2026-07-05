"use client";

import { ArrowUpDownIcon, CheckIcon, PlusIcon, RotateCcwIcon, X } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

type HeaderActionProps = {
  add?: {
    onAdd?: () => void;
    label?: string;
  };
  sort?: {
    isSort: boolean;
    isSortPending: boolean;
    onSortStart: () => void;
    onSortSave: () => void;
    onSortRestore: () => void;
    onSortCancel: () => void;
  };
};

export function HeaderActions({ add, sort }: HeaderActionProps) {
  const { isSort, isSortPending, onSortStart, onSortSave, onSortRestore, onSortCancel } =
    sort ?? {};

  const renderAdd = add?.onAdd && (
    <Button onClick={add.onAdd}>
      <PlusIcon />
      {add.label ?? "Add"}
    </Button>
  );

  return (
    <div className="flex gap-2">
      {isSort ? (
        <Group>
          <Button onClick={onSortSave} loading={isSortPending}>
            <CheckIcon />
            Save
          </Button>
          <GroupSeparator className="bg-primary/90" />
          <Button onClick={onSortRestore}>
            <RotateCcwIcon />
            Restore default
          </Button>
          <GroupSeparator className="bg-primary/90" />
          <Button aria-label="Cancel sort" size="icon" onClick={onSortCancel}>
            <X aria-hidden="true" />
          </Button>
        </Group>
      ) : (
        <>
          {onSortStart && (
            <Button onClick={onSortStart} variant="secondary">
              <ArrowUpDownIcon />
              Reorder
            </Button>
          )}
          {renderAdd}
        </>
      )}
    </div>
  );
}
