"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { DefaultLoader } from "@/shared/ui/default-loader";
import { SortableList } from "@/shared/ui/sortable-list";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/projects/")({
  component: ProjectsListPage
});

function ProjectsListPage() {
  const projectsQuery = useQuery(orpc.portfolio.projects.list.queryOptions());
  const queryClient = useQueryClient();

  const reorderMutation = useMutation(
    orpc.portfolio.projects.reorder.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.projects.list.queryKey()
        });
        toast.success("Order updated.");
      },
      onError: () => {
        toast.error("Failed to update order.");
      }
    })
  );

  if (!projectsQuery.data) {
    return (
      <div className="flex w-full items-center justify-center">
        <DefaultLoader />
      </div>
    );
  }

  const projects = projectsQuery.data;

  function handleReorder(newOrder: typeof projects) {
    reorderMutation.mutate({
      items: newOrder.map((proj, index) => {
        return { id: proj.id, sortOrder: index };
      })
    });
  }

  return (
    <div className="min-w-0 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reorder. Manage your portfolio projects and their tech stacks.
          </p>
        </div>
        <Button render={<Link to="/dashboard/projects/new" />}>
          <Plus />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>Add your first project to showcase your work.</EmptyDescription>
          </EmptyHeader>
          <Button render={<Link to="/dashboard/projects/new" />}>
            <Plus />
            Add Project
          </Button>
        </Empty>
      ) : (
        <SortableList items={projects} onReorder={handleReorder}>
          {(proj, dragHandleProps) => (
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
                    <GripVertical />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{proj.title}</CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">{proj.year}</p>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        render={
                          <Link
                            to="/dashboard/projects/$projectId"
                            params={{ projectId: proj.id }}
                          />
                        }
                      >
                        <Edit />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {proj.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{proj.description}</p>
                )}
                {proj.stacks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {proj.stacks.map((stack) => (
                      <Badge key={stack.id} variant="secondary">
                        {stack.icon ? (
                          <img
                            src={stack.icon}
                            alt=""
                            className="mr-1 inline-block size-3 rounded object-contain"
                          />
                        ) : null}
                        {stack.name}
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
