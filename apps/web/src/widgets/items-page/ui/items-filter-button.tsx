import { Check, Filter } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "@tsu-stack/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@tsu-stack/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { cn } from "@tsu-stack/ui/lib/utils";

export type ItemsFilterOption<Filter extends string> = {
  value: Filter;
  label: string;
};

type ItemsFilterButtonProps<Filter extends string> = {
  options: ReadonlyArray<ItemsFilterOption<Filter>>;
  value: Filter;
  onChange: (value: Filter) => void;
  /** Optional label shown before the current value (e.g. "Status:"). */
  label?: string;
  /** Optional trigger className override. */
  triggerClassName?: string;
  /** Content shown when Command finds no match. */
  emptyMessage?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
};

export function ItemsFilterButton<Filter extends string>({
  options,
  value,
  onChange,
  label = "Filter:",
  triggerClassName,
  emptyMessage = "No matches",
  searchPlaceholder = "Search..."
}: ItemsFilterButtonProps<Filter>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2",
          triggerClassName
        )}
        aria-label={`${label} ${current?.label ?? ""}`.trim()}
      >
        <Filter className="size-3.5" />
        {label}
        <span className="font-medium text-foreground">{current?.label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
