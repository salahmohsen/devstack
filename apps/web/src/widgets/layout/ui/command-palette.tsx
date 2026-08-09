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
import { cn } from "@tsu-stack/ui/lib/utils";

import { type CommandItem as CommandItemType } from "@/shared/lib/command-palette/types";
import { useCommandPalette } from "@/shared/lib/command-palette/use-command-palette";

const GROUP_ORDER = [
  "Pages",
  "Dashboard",
  "Settings",
  "Playground",
  "Actions",
  "Repositories",
  "Pull Requests",
  "Issues"
];

export function CommandPalette() {
  const { open, setOpen, close, items } = useCommandPalette();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CommandItemType[]>();
    for (const item of items) {
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
  }, [items]);

  const handleItemClick = useCallback(
    (item: CommandItemType) => {
      if (item.action.type === "navigate") {
        void router.navigate({
          to: item.action.to as never,
          params: item.action.params as never
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
          items={groupedItems}
          value={search}
          onValueChange={setSearch}
          itemToStringValue={(item) => {
            const cmd = item as CommandItemType;
            return `${cmd.label} ${cmd.keywords?.join(" ") ?? ""}`;
          }}
        >
          <CommandInput placeholder="Type a command or search..." />
          <CommandPanel>
            <CommandEmpty>
              {search.trim().length === 1
                ? "Type at least 2 characters to search."
                : "No results found."}
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
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.shortcut ? (
                            <KbdGroup className="ms-auto shrink-0">
                              {item.shortcut.map((key) => (
                                <Kbd key={key}>{key}</Kbd>
                              ))}
                            </KbdGroup>
                          ) : null}
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
