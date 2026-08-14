"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { IconSwap } from "@tsu-stack/ui/components/icon-swap";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useCuelumeEnabled } from "@/shared/lib/cuelume";

export function SoundMuteButton() {
  const [enabled, setEnabled] = useCuelumeEnabled();
  const muted = !enabled;
  const label = muted ? "Unmute sounds" : "Mute sounds";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-8", muted && "text-muted-foreground")}
            aria-label={label}
            aria-pressed={muted}
            onClick={() => setEnabled(muted)}
          />
        }
      >
        <IconSwap
          state={muted ? "b" : "a"}
          aria-hidden
          iconA={<Volume2Icon className="size-4" strokeWidth={2} />}
          iconB={<VolumeXIcon className="size-4" strokeWidth={2} />}
        />
      </TooltipTrigger>
      <TooltipPopup>{muted ? "Unmute" : "Mute"}</TooltipPopup>
    </Tooltip>
  );
}
