import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { FrameFooter } from "@tsu-stack/ui/components/frame.js";
import { KbdGroup } from "@tsu-stack/ui/components/kbd.js";

import { useItemsNavContext } from "@/widgets/items-page/lib/items-nav-context";

type ItemsInfoFooterProps = {
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

export function ItemsInfoFooter({ updatedAt, createdAt }: ItemsInfoFooterProps) {
  const { handlePrev, handleNext } = useItemsNavContext();

  return (
    <FrameFooter className="flex items-center justify-between py-2">
      <KbdGroup>
        <Button variant="ghost" onClick={handlePrev} size="icon">
          <ChevronLeft />
        </Button>
        <Button size="icon" onClick={handleNext} variant="ghost">
          <ChevronRight />
        </Button>
      </KbdGroup>
      {updatedAt ? (
        <div className="text-xs text-muted-foreground">
          Updated{" "}
          <time dateTime={new Date(updatedAt).toISOString()}>
            {new Date(updatedAt).toLocaleDateString("en-CA", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            })}
          </time>
        </div>
      ) : null}
      {createdAt ? (
        <div className="text-xs text-muted-foreground">
          Created at{" "}
          <time dateTime={new Date(createdAt).toISOString()}>
            {new Date(createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            })}
          </time>
        </div>
      ) : null}
    </FrameFooter>
  );
}
