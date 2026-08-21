import { Kbd, KbdGroup } from "@tsu-stack/ui/components/kbd";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { type CommandBinding, bindingAriaLabel, bindingDisplayParts } from "@/shared/lib/commands";

type HotkeyKbdProps = {
  binding: CommandBinding | null | undefined;
  className?: string;
};

export function HotkeyKbd({ binding, className }: HotkeyKbdProps) {
  const isClient = useIsClient();
  if (!binding || !isClient) return null;

  const parts = bindingDisplayParts(binding);

  return (
    <KbdGroup className={cn("ms-auto shrink-0", className)} aria-label={bindingAriaLabel(binding)}>
      {parts.map((part) => (
        <Kbd key={part}>{part}</Kbd>
      ))}
    </KbdGroup>
  );
}
