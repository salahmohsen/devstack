import { DotmSquare18 } from "@tsu-stack/ui/components/dotm-square-18";
import { cn } from "@tsu-stack/ui/lib/utils";

export const DefaultLoader = ({ className }: { className?: string }) => (
  <DotmSquare18 className={cn("min-w-full py-16", className)} size={28} dotSize={4} speed={1.2} />
);
