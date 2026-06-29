import { Package } from "lucide-react";

import { type StackOutput } from "@tsu-stack/core/portfolio";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type StackInfoProps = {
  stack: StackOutput | null;
};

export function StackInfo({ stack }: StackInfoProps) {
  if (!stack) return null;

  return (
    <Card className="me-5 mt-px flex flex-col pt-0 shadow-none">
      <CardHeader className="shrink-0 bg-accent py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {stack.icon ? (
              <img
                src={stack.icon}
                alt={stack.name}
                className="size-10 shrink-0 rounded object-contain"
              />
            ) : (
              <Package className="size-10 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            )}
            <div className="min-w-0">
              <CardTitle className="text-lg">{stack.name}</CardTitle>
              <CardDescription>Sort order: {stack.sortOrder}</CardDescription>
            </div>
          </div>
          {stack.enableAi ? <Badge variant="secondary">AI</Badge> : null}
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="space-y-4">
          {stack.description ? (
            <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
              {stack.description}
            </Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
        </CardContent>
      </ScrollArea>
      <ItemsInfoFooter />
    </Card>
  );
}
