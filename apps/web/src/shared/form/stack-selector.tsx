"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@tsu-stack/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useFieldContext } from "./form-contexts";

type StackSelectorProps = {
  label?: string;
  description?: string;
  className?: string;
};

function StackSelector(props: StackSelectorProps) {
  const field = useFieldContext<string[]>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  const stacksQuery = useQuery(orpc.portfolio.stacks.list.queryOptions());
  const stacks = stacksQuery.data ?? [];

  const selectedIds = field.state.value ?? [];
  const selectedStacks = stacks.filter((s) => selectedIds.includes(s.id));

  const createMutation = useMutation(
    orpc.portfolio.stacks.create.mutationOptions({
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.stacks.list.queryKey()
        });
        field.handleChange([...selectedIds, created.id]);
        setCreateOpen(false);
        setNewName("");
        setNewIcon("");
      }
    })
  );

  function toggleStack(stackId: string) {
    if (selectedIds.includes(stackId)) {
      field.handleChange(selectedIds.filter((id) => id !== stackId));
    } else {
      field.handleChange([...selectedIds, stackId]);
    }
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({
      name,
      icon: newIcon.trim() ? newIcon.trim() : null
    });
  }

  return (
    <Field>
      {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-expanded={open}
          className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-input/30 px-3 text-sm font-normal transition-colors outline-none hover:bg-input/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="truncate text-left">
            {selectedStacks.length === 0
              ? "Select stacks..."
              : selectedStacks.length === 1
                ? selectedStacks[0]?.name
                : `${selectedStacks.length} stacks selected`}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search stacks..." />
            <CommandList>
              <CommandEmpty>No stacks found.</CommandEmpty>
              <CommandGroup>
                {stacks.map((stack) => {
                  const isSelected = selectedIds.includes(stack.id);
                  return (
                    <CommandItem
                      key={stack.id}
                      value={stack.name}
                      onSelect={() => toggleStack(stack.id)}
                    >
                      <Check
                        className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      <StackOption stack={stack} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
              >
                <Plus />
                Create new stack
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedStacks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedStacks.map((stack) => (
            <span
              key={stack.id}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
            >
              {stack.icon ? (
                <img src={stack.icon} alt="" className="size-3 rounded object-contain" />
              ) : null}
              {stack.name}
              <button
                type="button"
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => toggleStack(stack.id)}
                aria-label={`Remove ${stack.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      <FieldError errors={field.state.meta.errors} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create stack</DialogTitle>
            <DialogDescription>
              Add a new shared stack. It will be selected automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="new-stack-name">Name</FieldLabel>
              <Input
                id="new-stack-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. React"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-stack-icon">Icon URL</FieldLabel>
              <Input
                id="new-stack-icon"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="https://..."
              />
              <FieldDescription>Optional image URL.</FieldDescription>
            </Field>
            {createMutation.error ? (
              <p className="text-destructive text-sm">
                {createMutation.error.message || "Failed to create stack."}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !newName.trim()}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Field>
  );
}

function StackOption({ stack }: { stack: StackOutput }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {stack.icon ? (
        <img src={stack.icon} alt="" className="size-4 shrink-0 rounded object-contain" />
      ) : null}
      <span className="truncate">{stack.name}</span>
    </div>
  );
}

export { StackSelector };
