"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { EditIcon, GripVerticalIcon, PlusSignIcon } from "@tsu-stack/icons";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { DefaultLoader } from "@/shared/ui/default-loader";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/experiences/")({
  component: ExperiencesListPage
});

function ExperiencesListPage() {
  const experiencesQuery = useQuery(orpc.portfolio.experiences.list.queryOptions());
  const queryClient = useQueryClient();

  const reorderMutation = useMutation(
    orpc.portfolio.experiences.reorder.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.experiences.list.queryKey()
        });
        toast.success("Order updated.");
      },
      onError: () => {
        toast.error("Failed to update order.");
      }
    })
  );

  if (!experiencesQuery.data) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  const experiences = experiencesQuery.data;

  function handleReorder(newOrder: typeof experiences) {
    reorderMutation.mutate({
      items: newOrder.map((exp, index) => {
        return { id: exp.id, sortOrder: index };
      })
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Experiences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder. Manage your professional background and positions.
          </p>
        </div>
        <Button render={<Link to="/dashboard/experiences/new" />}>
          <PlusSignIcon />
          Add Experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No experiences yet</EmptyTitle>
            <EmptyDescription>
              Add your first experience to start building your resume.
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link to="/dashboard/experiences/new" />}>
            <PlusSignIcon />
            Add Experience
          </Button>
        </Empty>
      ) : (
        <SortableList items={experiences} onReorder={handleReorder}>
          {(exp, dragHandleProps) => (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-2">
                  <button
                    {...dragHandleProps.attributes}
                    {...dragHandleProps.listeners}
                    aria-label="Drag to reorder"
                    className={dragHandleProps.className}
                    ref={dragHandleProps.ref}
                    type="button"
                  >
                    <GripVerticalIcon />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{exp.title}</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">{exp.organization}</p>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        render={
                          <Link
                            to="/dashboard/experiences/$experienceId"
                            params={{ experienceId: exp.id }}
                          />
                        }
                      >
                        <EditIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {exp.description && (
                  <Markdown className="prose prose-sm mb-3 max-w-none text-muted-foreground dark:prose-invert">
                    {exp.description}
                  </Markdown>
                )}
                {exp.projects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {exp.projects.map((proj) => (
                      <Badge key={proj.id} variant="secondary">
                        {proj.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </SortableList>
      )}
    </div>
  );
}
