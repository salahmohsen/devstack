import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ArchiveIcon, HouseIcon, LayoutDashboardIcon } from "@tsu-stack/icons";
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem as CommandItemUI,
  CommandList,
  CommandShortcut
} from "@tsu-stack/ui/components/command";
import { cn } from "@tsu-stack/ui/lib/utils";

import { registerCommands } from "@/shared/lib/command-palette/registry";
import { type CommandItem } from "@/shared/lib/command-palette/types";
import { useCommandItems } from "@/shared/lib/command-palette/use-command-items";
import { useCommandPalette } from "@/shared/lib/command-palette/use-command-palette";

// Register static navigation commands at module scope
registerCommands([
  {
    id: "nav:overview",
    label: "Go to Overview",
    group: "Pages",
    icon: HouseIcon,
    iconClassName: "text-base-400",
    shortcut: ["G", "H"],
    action: { type: "navigate" as const, to: "/" }
  },
  {
    id: "nav:repos",
    label: "Go to Repositories",
    group: "Pages",
    icon: ArchiveIcon,
    iconClassName: "text-base-400",
    shortcut: ["G", "O"],
    action: { type: "navigate" as const, to: "/$repo" }
  },
  {
    id: "nav:dashboard",
    label: "Go to Dashboard",
    group: "Pages",
    icon: LayoutDashboardIcon,
    iconClassName: "text-base-400",
    shortcut: ["G", "D"],
    action: { type: "navigate" as const, to: "/dashboard" }
  }
]);

export function CommandPalette() {
  const { open, setOpen, close } = useCommandPalette();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const items = useCommandItems();

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.keywords ?? []).some((k) => k.toLowerCase().includes(query))
    );
  }, [items, search]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [filteredItems]);

  function handleSelect(item: CommandItem) {
    setSearch("");
    close();
    if (item.action.type === "navigate") {
      void router.navigate({ to: item.action.to, params: item.action.params });
    } else {
      void item.action.fn();
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSearch("");
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <CommandList>
        <CommandEmpty>
          {search.trim().length === 1
            ? "Type at least 2 characters to search."
            : "No results found."}
        </CommandEmpty>
        {Array.from(groups.entries()).map(([groupName, groupItems]) => (
          <div key={groupName} data-slot="command-group">
            <div data-slot="command-group-heading">{groupName}</div>
            {groupItems.map((item) => (
              <CommandItemUI
                key={item.id}
                value={`${item.label} ${(item.keywords ?? []).join(" ")}`}
                onSelect={() => handleSelect(item)}
              >
                {item.icon && <item.icon className={cn("size-4 shrink-0", item.iconClassName)} />}
                <span className="mr-4 min-w-0 flex-1 truncate text-sm">{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut.join(" ")}</CommandShortcut>}
              </CommandItemUI>
            ))}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
