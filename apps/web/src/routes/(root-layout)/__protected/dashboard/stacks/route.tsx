"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@tsu-stack/ui/components/empty";

import { DefaultLoader } from "@/shared/ui/default-loader";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/stacks")({
  component: StacksListPage
});

function StacksListPage() {
  const stacksQuery = useQuery(orpc.portfolio.stacks.list.queryOptions());
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation(
    orpc.portfolio.stacks.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.projects.list.queryKey()
        });
        toast.success("Stack deleted.");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Failed to delete stack.");
      }
    })
  );

  if (!stacksQuery.data) {
    return <DefaultLoader className="mx-auto mt-16" />;
  }

  const stacks = stacksQuery.data;
  const stackToDelete = deleteId ? (stacks.find((s) => s.id === deleteId) ?? null) : null;

  return (
    <div className="min-w-0 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Tech Stacks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared technologies you can attach to your projects.
          </p>
        </div>
        <Button render={<Link to="/dashboard/stacks/new" />}>
          <Plus />
          Add Stack
        </Button>
      </div>

      {stacks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No stacks configured</EmptyTitle>
            <EmptyDescription>Add a stack to reuse it across multiple projects.</EmptyDescription>
          </EmptyHeader>
          <Button render={<Link to="/dashboard/stacks/new" />}>
            <Plus />
            Add Stack
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stacks.map((stack) => (
            <Card key={stack.id} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {stack.icon ? (
                      <img
                        src={stack.icon}
                        alt={stack.name}
                        className="size-4 rounded object-contain"
                      />
                    ) : (
                      <Package className="size-4 text-muted-foreground" />
                    )}
                    <CardTitle className="truncate">{stack.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      render={
                        <Link to="/dashboard/stacks/$stackId" params={{ stackId: stack.id }} />
                      }
                      aria-label="Edit stack"
                    >
                      <Edit />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setDeleteId(stack.id)}
                      aria-label="Delete stack"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {stack.icon ? (
                  <p className="text-xs break-all text-muted-foreground">{stack.icon}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No icon</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this stack?</DialogTitle>
            <DialogDescription>
              {stackToDelete
                ? `"${stackToDelete.name}" will be removed from all projects that use it.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteId(null)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => stackToDelete && deleteMutation.mutate({ id: stackToDelete.id })}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
