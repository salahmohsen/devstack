import { cn } from "@tsu-stack/ui/lib/utils";

export function PageLayout(props: React.ComponentProps<"div">) {
  return <div className={cn("space-y-5", props.className)}>{props.children}</div>;
}
