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

type GitHubRepoMultiComboboxProps = {
  label?: string;
  description?: string;
  className?: string;
};

function GitHubRepoMultiCombobox(props: GitHubRepoMultiComboboxProps) {
  const field = useFieldContext<string[]>();
  const { user } = useAuthSuspense();
  const [open, setOpen] = useState(false);

  const username = sessionUsernameFromUser(user) ?? "me";
  const reposQuery = useQuery(getGithubProfileReposQueryOptions(username, true));
  const repos: GitHubUserRepoSummary[] = reposQuery.data ?? [];
  const isLoading = reposQuery.isLoading;

  const selectedUrls: string[] = field.state.value ?? [];
  const selectedRepos = repos.filter((repo) => selectedUrls.includes(repo.url));

  function toggle(url: string) {
    const next = selectedUrls.includes(url)
      ? selectedUrls.filter((u) => u !== url)
      : [...selectedUrls, url];
    field.handleChange(next);
  }

  function clear() {
    field.handleChange([]);
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
              ) : selectedRepos.length > 0 ? (
                <span className="truncate">
                  {selectedRepos.length === 1
                    ? selectedRepos[0]?.fullName
                    : `${selectedRepos.length} repositories selected`}
                </span>
              ) : (
                "Select repositories..."
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
                    const isSelected = selectedUrls.includes(repo.url);
                    return (
                      <CommandItem
                        key={repo.id}
                        value={`${repo.fullName} ${repo.description ?? ""}`}
                        onClick={() => toggle(repo.url)}
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
        {selectedUrls.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            aria-label="Clear repositories"
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

export { GitHubRepoMultiCombobox };
