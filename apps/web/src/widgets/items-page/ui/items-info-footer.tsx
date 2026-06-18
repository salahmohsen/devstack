import { format } from "date-fns";

import { ChevronLeftIcon, ChevronRightIcon } from "@tsu-stack/icons";
import { Button } from "@tsu-stack/ui/components/button";
import { CardFooter } from "@tsu-stack/ui/components/card";

import { useItemsNavContext } from "@/widgets/items-page/lib/items-nav-context";

type ItemsInfoFooterProps = {
  updatedAt?: string | Date | null;
  prevLabel?: string;
  nextLabel?: string;
};

export function ItemsInfoFooter({
  updatedAt,
  prevLabel = "Previous",
  nextLabel = "Next"
}: ItemsInfoFooterProps) {
  const { handlePrev, handleNext } = useItemsNavContext();

  return (
    <CardFooter className="flex w-full flex-row items-center gap-2 border-t px-6">
      {updatedAt ? (
        <div className="text-xs text-muted-foreground">
          Updated{" "}
          <time dateTime={new Date(updatedAt).toISOString()}>
            {format(new Date(updatedAt), "dd MMMM yyyy")}
          </time>
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        <Button size="icon-sm" variant="outline" onClick={handlePrev} aria-label={prevLabel}>
          <ChevronLeftIcon />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={handleNext} aria-label={nextLabel}>
          <ChevronRightIcon />
        </Button>
      </div>
    </CardFooter>
  );
}
