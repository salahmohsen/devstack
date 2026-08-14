"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Lock, X } from "lucide-react";
import { useState } from "react";

import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type GitHubUserRepoSummary } from "@tsu-stack/github/schemas";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@tsu-stack/ui/components/command";
import { Field, FieldError } from "@tsu-stack/ui/components/field";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { FieldLabelWithTooltip } from "@/shared/form/field-label-with-tooltip";
import { useFieldContext } from "@/shared/form/form-contexts";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import { getGithubProfileReposQueryOptions } from "@/features/github/api/get-github-profile-repos.query";

type GitHubRepoComboboxProps = {
  label?: string;
  description?: string;
  className?: string;
};

function GitHubRepoCombobox(props: GitHubRepoComboboxProps) {
  const field = useFieldContext<string>();
  // `useAuth()` (which uses `useQuery`) returns `user: undefined` on
  // first render while the Better Auth session is still resolving. That
  // race made the combobox fall back to `publicGetProfileRepos` and
  // lock the query key for the rest of the session, so the owner
  // never saw their private repos even after the auth query
  // resolved. `useAuthSuspense()` uses `useSuspenseQuery`, which
  // suspends the component until the session is confirmed —
  // guaranteeing `user` is set (or a Suspense boundary above us
  // catches the unauthenticated case) before we pick an endpoint.
  const { user } = useAuthSuspense();
  const [open, setOpen] = useState(false);

  // Dashboard combobox: always the signed-in user's private repos (multi-tenant).
  const username = sessionUsernameFromUser(user) ?? "me";
  const reposQuery = useQuery(getGithubProfileReposQueryOptions(username, true));
  const repos: GitHubUserRepoSummary[] = reposQuery.data ?? [];
  const isLoading = reposQuery.isLoading;

  const selectedUrl = field.state.value ?? "";
  const selectedRepo = repos.find((repo) => repo.url === selectedUrl);

  function handleSelect(url: string) {
    if (url === selectedUrl) {
      field.handleChange("");
    } else {
      field.handleChange(url);
    }
    setOpen(false);
  }

  return (
    <Field>
      <FieldLabelWithTooltip label={props.label} description={props.description} />
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            aria-expanded={open}
            className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-input/30 px-3 text-sm font-normal transition-colors outline-none hover:bg-input/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="truncate text-left">
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : selectedRepo ? (
                <span className="inline-flex items-center gap-1.5">
                  {selectedRepo.isPrivate ? (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : null}
                  <span className="truncate">{selectedRepo.fullName}</span>
                </span>
              ) : selectedUrl ? (
                <span className="truncate">{selectedUrl}</span>
              ) : (
                "Select a repository..."
              )}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command>
              <CommandInput placeholder="Search repositories..." />
              <CommandList>
                <CommandEmpty>No repositories found.</CommandEmpty>
                <CommandGroup>
                  {repos.map((repo) => {
                    const isSelected = repo.url === selectedUrl;
                    return (
                      <CommandItem
                        key={repo.id}
                        value={`${repo.fullName} ${repo.description ?? ""}`}
                        // The local `CommandItem` is a styled <button> (not
                        // the cmdk version), so `onSelect` is never fired.
                        // Use the native `onClick` to actually trigger
                        // selection.
                        onClick={() => handleSelect(repo.url)}
                      >
                        <Check
                          className={cn(
                            "size-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <RepoOption repo={repo} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedUrl ? (
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={() => field.handleChange("")}
            aria-label="Clear repository"
          >
            <X />
          </Button>
        ) : null}
      </div>
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

function RepoOption({ repo }: { repo: GitHubUserRepoSummary }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 truncate text-sm">
        {repo.isPrivate ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        <span className="truncate font-medium">{repo.fullName}</span>
      </span>
      {repo.description ? (
        <span className="truncate text-xs text-muted-foreground">{repo.description}</span>
      ) : null}
    </div>
  );
}

export { GitHubRepoCombobox };
