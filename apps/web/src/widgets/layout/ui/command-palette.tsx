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
  CommandSeparator,
  CommandShortcut
} from "@tsu-stack/ui/components/command";
import { Kbd, KbdGroup } from "@tsu-stack/ui/components/kbd.js";

import { type CommandItem as CommandItemType } from "@/shared/lib/command-palette/types";
import { useCommandItems } from "@/shared/lib/command-palette/use-command-items";
import { useCommandPalette } from "@/shared/lib/command-palette/use-command-palette";

export function CommandPalette() {
  const { open, setOpen, close } = useCommandPalette();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const items = useCommandItems();

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CommandItemType[]>();
    for (const item of items) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries()).map(([label, items]) => {
      return { label, items };
    });
  }, [items]);

  const handleItemClick = useCallback(
    (item: CommandItemType) => {
      if (item.action.type === "navigate") {
        void router.navigate({ to: item.action.to, params: item.action.params });
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
                          <div className="flex gap-2">
                            {item.icon && <item.icon className={item.iconClassName} />}
                            {item.label}
                          </div>
                          {item.shortcut && (
                            <CommandShortcut>{item.shortcut.join(" ")}</CommandShortcut>
                          )}
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
