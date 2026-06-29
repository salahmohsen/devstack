import { cn } from "@tsu-stack/ui/lib/utils";

export function PageLayout(props: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex min-h-0 w-full flex-col gap-5 space-y-5 p-5", props.className)}>
      {props.children}
    </div>
  );
}
