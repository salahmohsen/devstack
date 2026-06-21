import { Search } from "lucide-react";
import * as React from "react";

import { Dialog, DialogContent } from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

type CommandContextValue = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
};

const CommandContext = React.createContext<CommandContextValue | null>(null);

function useCommandContext() {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error("Command components must be used inside <Command />.");
  }

  return context;
}

function Command({ className, ...props }: React.ComponentProps<"div">) {
  const [query, setQuery] = React.useState("");

  return (
    <CommandContext.Provider value={{ query, setQuery }}>
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover",
          className
        )}
        data-slot="command"
        {...props}
      />
    </CommandContext.Provider>
  );
}

function CommandInput({ className, onChange, value, ...props }: React.ComponentProps<"input">) {
  const { query, setQuery } = useCommandContext();

  return (
    <div className="flex items-center gap-2 border-b px-3" data-slot="command-input-wrapper">
      <Search className="size-4 text-muted-foreground" />
      <input
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        data-slot="command-input"
        onChange={(event) => {
          setQuery(event.target.value);
          onChange?.(event);
        }}
        value={value ?? query}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("max-h-80 overflow-x-hidden overflow-y-auto p-1", className)}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"div">) {
  const { query } = useCommandContext();

  if (!query) {
    return null;
  }

  return (
    <div
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      data-slot="command-empty"
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group-heading]]:text-muted-foreground",
        className
      )}
      data-slot="command-group"
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      data-slot="command-item"
      type="button"
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      data-slot="command-shortcut"
      {...props}
    />
  );
}

function CommandDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="**:data-[slot=command-list]:max-h-75 [&_[data-slot=command-input]]:border-0">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
};
