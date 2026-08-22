import { useRouter } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, CornerDownLeftIcon } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";

import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator
} from "@tsu-stack/ui/components/command";
import { Kbd, KbdGroup } from "@tsu-stack/ui/components/kbd.js";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { useFuzzyFilter } from "@tsu-stack/ui/hooks/use-fuzzy-filter";
import { cn } from "@tsu-stack/ui/lib/utils";

import { type CommandItem as CommandItemType } from "@/shared/lib/command-palette/types";
import { useCommandPalette } from "@/shared/lib/command-palette/use-command-palette";
import { isCommandId, useCommandBindings } from "@/shared/lib/commands";
import { HotkeyKbd } from "@/shared/ui/hotkey-kbd";

const GROUP_ORDER = [
  "Pages",
  "Dashboard",
  "Experiences",
  "Projects",
  "Skills",
  "Resumes",
  "New jobs",
  "Tracked jobs",
  "Settings",
  "Playground",
  "Actions",
  "Repositories",
  "Pull Requests",
  "Issues"
];

function passThroughFilter() {
  return true;
}

function commandItemToString(item: unknown): string {
  if (!item || typeof item !== "object") return "";
  const record = item as { label?: unknown; keywords?: unknown; sublabel?: unknown };
  const label = typeof record.label === "string" ? record.label : "";
  const sublabel = typeof record.sublabel === "string" ? record.sublabel : "";
  const keywords = Array.isArray(record.keywords)
    ? record.keywords.filter((value): value is string => typeof value === "string").join(" ")
    : "";
  return `${label} ${sublabel} ${keywords}`.trim();
}

export function CommandPalette() {
  const [search, setSearch] = useState("");
  const { open, setOpen, close, items, isSearching } = useCommandPalette(search);
  const bindings = useCommandBindings();
  const router = useRouter();
  const { filter } = useFuzzyFilter<CommandItemType>({
    keys: ["label", "sublabel", "keywords"]
  });

  const groupedItems = useMemo(() => {
    const query = search.trim();
    const navItems: CommandItemType[] = [];
    const entityItems: CommandItemType[] = [];
    for (const item of items) {
      if (item.id.startsWith("entity:")) entityItems.push(item);
      else navItems.push(item);
    }
    // Entity hits are already SQL-filtered (aliases, linked jobs). A second
    // fuzzy pass on label/sublabel would drop those rows.
    const ranked = query.length > 0 ? [...filter(navItems, query), ...entityItems] : navItems;
    const groups = new Map<string, CommandItemType[]>();
    for (const item of ranked) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries())
      .toSorted(([a], [b]) => {
        const ai = GROUP_ORDER.indexOf(a);
        const bi = GROUP_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([label, groupItems]) => {
        return { label, items: groupItems };
      });
  }, [filter, items, search]);

  const handleItemClick = useCallback(
    (item: CommandItemType) => {
      if (item.action.type === "navigate") {
        void router.navigate({
          to: item.action.to as never,
          params: item.action.params as never,
          ...(item.action.search ? { search: item.action.search as never } : {})
        });
      } else {
        void item.action.fn();
      }
      close();
    },
    [router, close]
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSearch("");
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandDialogPopup>
        <Command
          filter={passThroughFilter}
          items={groupedItems}
          itemToStringValue={commandItemToString}
          onValueChange={setSearch}
          value={search}
        >
          <CommandInput placeholder="Type a command or search..." />
          <CommandPanel aria-busy={isSearching || undefined}>
            <CommandEmpty>
              {isSearching ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner aria-hidden className="size-4" />
                  Searching…
                </span>
              ) : search.trim().length === 1 ? (
                "Type at least 2 characters to search."
              ) : (
                "No results found."
              )}
            </CommandEmpty>
            <CommandList>
              {(group: { label: string; items: CommandItemType[] }, index: number) => (
                <Fragment key={group.label}>
                  {index > 0 && <CommandSeparator />}
                  <CommandGroup items={group.items}>
                    <CommandGroupLabel>{group.label}</CommandGroupLabel>
                    <CommandCollection>
                      {(item: CommandItemType) => (
                        <CommandItem value={item.id} onClick={() => handleItemClick(item)}>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {item.icon ? (
                              <item.icon
                                className={cn("size-4 shrink-0 opacity-80", item.iconClassName)}
                              />
                            ) : null}
                            <span className="min-w-0 truncate">{item.label}</span>
                            {item.sublabel ? (
                              <span className="ms-auto max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">
                                {item.sublabel}
                              </span>
                            ) : null}
                          </div>
                          {isCommandId(item.id) ? <HotkeyKbd binding={bindings[item.id]} /> : null}
                        </CommandItem>
                      )}
                    </CommandCollection>
                  </CommandGroup>
                </Fragment>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <KbdGroup>
                  <Kbd>
                    <ArrowUpIcon />
                  </Kbd>
                  <Kbd>
                    <ArrowDownIcon />
                  </Kbd>
                </KbdGroup>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>
                  <CornerDownLeftIcon />
                </Kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Kbd>Esc</Kbd>
              <span>Close</span>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
