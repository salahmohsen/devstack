"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue
} from "@tsu-stack/ui/components/combobox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Field } from "@tsu-stack/ui/components/field";
import { Label } from "@tsu-stack/ui/components/label";

import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";

import { useGetGithubProfileReposQuery } from "@/features/github";
import { startDetectStacksJob } from "@/features/stacks";
type RepoItem = {
  value: string;
  label: string;
};

type DetectStacksReposDialogProps = {
  /** Existing project only — menu path requires an id. */
  project: ProjectOutput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Menu-entry dialog: confirm/edit project repos, persist via projects.update,
 * then start the detached detect-stacks job.
 *
 * Prefill is via initial state — remount with `key={project.id}` (or open session)
 * when opening for a project so selection resets without an effect.
 */
export function DetectStacksReposDialog({
  project,
  open,
  onOpenChange
}: DetectStacksReposDialogProps) {
  const queryClient = useQueryClient();
  // Dashboard: session user's private repos only.
  const reposQuery = useGetGithubProfileReposQuery("me", true);
  const repoItems: RepoItem[] = useMemo(
    () =>
      (reposQuery.data ?? []).map((repo) => {
        return {
          value: repo.url,
          label: repo.fullName
        };
      }),
    [reposQuery.data]
  );

  const [selectedUrls, setSelectedUrls] = useState<string[]>(() => project.repos ?? []);

  const itemsByValue = useMemo(
    () => new Map(repoItems.map((item) => [item.value, item])),
    [repoItems]
  );
  const selectedItems: RepoItem[] = selectedUrls.map(
    (url) => itemsByValue.get(url) ?? { value: url, label: url }
  );

  const updateMutation = useMutation(
    orpcQueryClient.projects.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message ?? "Failed to save repositories.");
      }
    })
  );

  const busy = updateMutation.isPending;
  const canStart = selectedUrls.length > 0;

  async function handleStart() {
    if (selectedUrls.length === 0) {
      toast.error("Select at least one repository first.");
      return;
    }

    try {
      // UpdateProjectInputSchema still requires summary/description at the wire;
      // only repos is intentionally changed (menu path saves repos only).
      await updateMutation.mutateAsync({
        id: project.id,
        data: {
          repos: selectedUrls,
          summary: project.summary,
          description: project.description
        }
      });

      await invalidateProjectsListQueries(queryClient);
      await queryClient.invalidateQueries({
        queryKey: orpcQueryClient.projects.get.queryKey({
          input: { id: project.id }
        })
      });

      onOpenChange(false);
      // Single-flight / ready-reopen handled inside the job runner.
      startDetectStacksJob({ projectId: project.id, repos: selectedUrls });
    } catch {
      // onError toast already shown
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detect stacks</DialogTitle>
          <DialogDescription>
            Choose repositories for “{project.title}”. Changes are saved before detection starts.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-3">
          <Field>
            <Label htmlFor="detect-stacks-repos">Repositories</Label>
            <Combobox
              items={repoItems}
              multiple
              itemToStringValue={(item) => item.value}
              value={selectedItems}
              onValueChange={(next) => {
                const arr: RepoItem[] = Array.isArray(next) ? next : [];
                setSelectedUrls(arr.map((item) => item.value));
              }}
            >
              <ComboboxChips className="max-h-28 overflow-y-auto" id="detect-stacks-repos">
                <ComboboxValue>
                  {(selected: RepoItem[]) => (
                    <>
                      {selected?.map((item) => (
                        <ComboboxChip aria-label={item.label} key={item.value}>
                          {item.label}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        aria-label="Select repositories"
                        placeholder={selected.length > 0 ? undefined : "Select repositories..."}
                      />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxPopup className="max-h-60">
                <ComboboxEmpty>
                  {reposQuery.isLoading ? "Loading repositories…" : "No repositories found."}
                </ComboboxEmpty>
                <ComboboxList>
                  {(item: RepoItem) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </Field>
          {selectedUrls.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Select at least one repository to run stack detection.
            </p>
          ) : null}
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>
            Cancel
          </DialogClose>
          <Button type="button" disabled={!canStart || busy} onClick={() => void handleStart()}>
            <SparklesIcon aria-hidden />
            {busy ? "Saving…" : "Start detection"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
