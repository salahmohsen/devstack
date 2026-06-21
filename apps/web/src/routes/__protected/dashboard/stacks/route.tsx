import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { DefaultLoader } from "@/shared/ui/default-loader";

export const Route = createFileRoute("/__protected/dashboard/stacks")({
  component: StacksListPage
});

function StacksListPage() {
  const projectsQuery = useQuery(orpc.portfolio.projects.list.queryOptions());
  const projects = projectsQuery.data;

  if (!projects) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  const allStacks = projects.flatMap((proj) =>
    proj.stacks.map((stack) => {
      return { ...stack, projectTitle: proj.title, projectId: proj.id };
    })
  );

  const groupedByName = allStacks.reduce(
    (acc, stack) => {
      const existing = acc.get(stack.name);
      if (existing) {
        existing.projects.push({ id: stack.projectId, title: stack.projectTitle });
      } else {
        acc.set(stack.name, {
          name: stack.name,
          iconUrl: stack.iconUrl,
          projects: [{ id: stack.projectId, title: stack.projectTitle }]
        });
      }
      return acc;
    },
    new Map<
      string,
      {
        name: string;
        iconUrl: string | null;
        projects: Array<{ id: string; title: string }>;
      }
    >()
  );

  const stackGroups = [...groupedByName.values()].toSorted((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Tech Stacks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All technology stacks used across your projects.
        </p>
      </div>

      {stackGroups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No stacks configured</EmptyTitle>
            <EmptyDescription>
              Stacks appear here once you add them to your projects.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stackGroups.map((stack) => (
            <Card key={stack.name} size="sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  <CardTitle>{stack.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-muted-foreground">
                  Used in {stack.projects.length}{" "}
                  {stack.projects.length === 1 ? "project" : "projects"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {stack.projects.map((proj) => (
                    <Badge key={proj.id} variant="outline">
                      {proj.title}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
