import { cn } from "@tsu-stack/ui/lib/utils";

export function PageLayout(props: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col gap-4 p-3 md:gap-5 md:p-5",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}
