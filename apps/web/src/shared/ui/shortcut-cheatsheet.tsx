import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import {
  COMMAND_CATALOG,
  setShortcutCheatsheetOpen,
  useCommandBindings,
  useShortcutCheatsheetOpen,
  type CommandBinding
} from "@/shared/lib/commands";
import { HotkeyKbd } from "@/shared/ui/hotkey-kbd";

const GROUP_ORDER = ["Global", "Pages", "Agent", "Settings", "Playground", "Tabs"] as const;

export function ShortcutCheatsheet() {
  const open = useShortcutCheatsheetOpen();
  const bindings = useCommandBindings();

  const grouped = useMemo(
    () =>
      GROUP_ORDER.flatMap((group) => {
        const commands = COMMAND_CATALOG.filter((command) => {
          if (command.group !== group) return false;
          return bindings[command.id] != null;
        }).map((command) => {
          return { command, binding: bindings[command.id] as CommandBinding };
        });
        return commands.length > 0 ? [{ group, commands }] : [];
      }),
    [bindings]
  );

  return (
    <Dialog open={open} onOpenChange={setShortcutCheatsheetOpen}>
      <DialogPopup className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Current bindings for this session.</DialogDescription>
        </DialogHeader>
        <DialogPanel className="pt-0">
          <div className="grid gap-6 sm:grid-cols-2">
            {grouped.map((entry) => (
              <section key={entry.group} className="min-w-0">
                <h3 className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {entry.group}
                </h3>
                <ul className="flex flex-col gap-1">
                  {entry.commands.map(({ command, binding }) => (
                    <li
                      key={command.id}
                      className="flex min-h-7 items-center justify-between gap-3"
                    >
                      <span className="min-w-0 truncate text-sm">{command.label}</span>
                      <HotkeyKbd binding={binding} className="ms-0" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/dashboard/settings/shortcuts" />}
            onClick={() => setShortcutCheatsheetOpen(false)}
          >
            Customize
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
