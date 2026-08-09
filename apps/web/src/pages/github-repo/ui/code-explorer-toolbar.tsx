import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Code, Copy, Download, GitBranch } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type RepoOverview } from "@tsu-stack/github/repo/shared.types.js";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from "@tsu-stack/ui/components/command";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame.js";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { Kbd } from "@tsu-stack/ui/components/kbd.js";
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";
import { cn } from "@tsu-stack/ui/lib/utils";

import { isValidGithubRepoSlug } from "@/shared/lib/github-repo-slug";
import { useRepoCloneProtocol } from "@/shared/lib/repo-clone-protocol-storage";
import { sessionProfileNameFromUser } from "@/shared/lib/session-profile-name";

import { getGithubRepoBranchesQueryOptions } from "@/pages/github-repo/api/get-github-repo-branches.query";

type BranchListItem = {
  name: string;
  isDefault: boolean;
};

export function CodeExplorerToolbar({
  currentRef,
  onBranchChange,
  profileName,
  repo
}: {
  currentRef: string;
  onBranchChange: (branch: string) => void;
  profileName: string;
  repo: RepoOverview;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <BranchSelector
        currentRef={currentRef}
        onBranchChange={onBranchChange}
        profileName={profileName}
        repo={repo}
      />
      <CodePopover repo={repo} />
    </div>
  );
}

function BranchSelector({
  currentRef,
  onBranchChange,
  profileName,
  repo
}: {
  currentRef: string;
  onBranchChange: (branch: string) => void;
  profileName: string;
  repo: RepoOverview;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionProfileName = sessionProfileNameFromUser(user);
  const isPrivate = Boolean(user && sessionProfileName === profileName);

  const branchesOptions = getGithubRepoBranchesQueryOptions(repo.name, isPrivate, profileName);

  const branchesQuery = useQuery({
    ...branchesOptions,
    enabled: open && isValidGithubRepoSlug(repo.name)
  });

  const prefetchBranches = useCallback(() => {
    void queryClient.prefetchQuery(branchesOptions);
  }, [queryClient, branchesOptions]);

  const defaultBranch = repo.defaultBranch ?? "main";

  // Base UI Autocomplete only filters/renders items passed via `items` + list render prop.
  // Manual CommandItem children (old cmdk style) never join the collection → empty state + missing rows.
  const branchItems = useMemo((): BranchListItem[] => {
    const fromApi = branchesQuery.data ?? [];
    const byName = new Map(fromApi.map((b) => [b.name, b.name]));
    // Seed default so the picker is usable while loading; on hard error keep it so
    // the user can still return to default without a full empty panel.
    if (!byName.has(defaultBranch)) {
      byName.set(defaultBranch, defaultBranch);
    }
    // Always include the current ref so an open branch is selectable even if the
    // API page of branches omitted it (pagination / rename edge cases).
    if (currentRef && !byName.has(currentRef)) {
      byName.set(currentRef, currentRef);
    }
    return [...byName.values()]
      .map((name) => {
        return { name, isDefault: name === defaultBranch };
      })
      .toSorted((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [branchesQuery.data, currentRef, defaultBranch]);

  const loadedCount = branchesQuery.data?.length;
  const displayCount = loadedCount ?? repo.branchCount;
  const showLoadError = branchesQuery.isError && !branchesQuery.data?.length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger>
        <Button
          variant="secondary"
          size="sm"
          onMouseEnter={prefetchBranches}
          onFocus={prefetchBranches}
          className="max-w-55 border border-border dark:border-transparent"
        >
          <GitBranch size={14} />
          <span className="truncate">{currentRef}</span>
          <ChevronDown size={14} className="shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 **:data-[slot=command-list]:scroll-py-1 **:data-[slot=command-list]:p-1"
        align="start"
      >
        {showLoadError ? (
          <p
            className="border-b border-border/60 px-2.5 py-1.5 text-xs text-destructive"
            role="alert"
          >
            Couldn&apos;t load the full branch list. You can still pick the default.
          </p>
        ) : null}
        <Command
          items={branchItems}
          value={search}
          onValueChange={setSearch}
          itemToStringValue={(item) => (item as BranchListItem).name}
          className="gap-0"
        >
          {/* Override CommandInput’s outer px-2.5 py-1.5 + default size lg. */}
          <div className="[&>div]:px-1.5 [&>div]:py-1">
            <CommandInput placeholder="Find a branch…" size="sm" />
          </div>
          <CommandEmpty className="text-xs not-empty:py-2">
            {branchesQuery.isLoading
              ? "Loading…"
              : showLoadError
                ? "Only the default branch is available."
                : "No branches found."}
          </CommandEmpty>
          <CommandList className="max-h-56 p-1 not-empty:scroll-py-1 not-empty:p-1">
            {(branch: BranchListItem) => (
              <CommandItem
                key={branch.name}
                value={branch}
                onClick={() => {
                  onBranchChange(branch.name);
                  setOpen(false);
                }}
                className={cn(
                  "min-h-7 gap-2 py-1 sm:min-h-7 sm:py-1",
                  branch.name === currentRef && "font-medium text-foreground"
                )}
              >
                <Check
                  size={14}
                  className={cn(
                    "shrink-0",
                    branch.name === currentRef ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                {branch.isDefault ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground">default</span>
                ) : null}
              </CommandItem>
            )}
          </CommandList>
        </Command>
        <div className="border-t px-2.5 py-1">
          <span className="text-xs text-muted-foreground">
            {displayCount} branch{displayCount !== 1 ? "es" : ""}
            {showLoadError ? " (partial)" : null}
            {repo.tagCount > 0 && (
              <>
                {" · "}
                {repo.tagCount} tag{repo.tagCount !== 1 ? "s" : ""}
              </>
            )}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CodePopover({ repo }: { repo: RepoOverview }) {
  const [selectedProtocol, setSelectedProtocol] = useRepoCloneProtocol();
  const [copied, setCopied] = useState(false);
  const httpsUrl = `https://github.com/${repo.fullName}.git`;
  const sshUrl = `git@github.com:${repo.fullName}.git`;
  const cliCommand = `gh repo clone ${repo.fullName}`;
  const zipUrl = `https://github.com/${repo.fullName}/archive/refs/heads/${repo.defaultBranch ?? "main"}.zip`;

  const handleProtocolChange = useCallback(
    (protocol: string) => {
      setSelectedProtocol(protocol);
    },
    [setSelectedProtocol]
  );

  const handleCopy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="default" size="sm">
          <Code size={14} />
          Code
          <ChevronDown size={14} className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 overflow-hidden *:bg-transparent *:p-0!" align="end">
        <Frame className="w-full rounded-none">
          <FrameHeader>
            <FrameTitle>
              Clone <Kbd>{repo.fullName}</Kbd>
            </FrameTitle>
          </FrameHeader>
          <FramePanel>
            <Tabs
              value={selectedProtocol}
              onValueChange={handleProtocolChange}
              className="w-full min-w-0 gap-0"
            >
              <TabsList className="h-8 w-fit">
                <TabsTrigger value="https">HTTPS</TabsTrigger>
                <TabsTrigger value="ssh">SSH</TabsTrigger>
                <TabsTrigger value="cli">CLI</TabsTrigger>
              </TabsList>

              <TabsContent value="https" className="w-full min-w-0 py-4">
                <CloneInput copied={copied} onCopy={() => handleCopy(httpsUrl)} value={httpsUrl} />
                <p className="mt-1.5 text-xs text-muted-foreground">Clone using the web URL.</p>
              </TabsContent>
              <TabsContent value="ssh" className="w-full min-w-0 pt-4 pb-3">
                <CloneInput copied={copied} onCopy={() => handleCopy(sshUrl)} value={sshUrl} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Use a password-protected SSH key.
                </p>
              </TabsContent>
              <TabsContent value="cli" className="w-full min-w-0 pt-4 pb-3">
                <CloneInput
                  copied={copied}
                  onCopy={() => handleCopy(cliCommand)}
                  value={cliCommand}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Work fast with the official CLI.
                </p>
              </TabsContent>
            </Tabs>
          </FramePanel>
          <FrameFooter className="py-2">
            <a
              href={zipUrl}
              download
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              <Download size={15} className="text-muted-foreground" />
              Download ZIP
            </a>
          </FrameFooter>
        </Frame>
      </PopoverContent>
    </Popover>
  );
}

function CloneInput({
  copied,
  onCopy,
  value
}: {
  copied: boolean;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
      <input
        readOnly
        value={value}
        aria-label="Clone command"
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-w-0 truncate rounded-md border border-border bg-surface-1 px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onCopy}>
        <IconMorph
          active={copied}
          iconA={<Copy size={14} />}
          iconB={<Check size={14} className="text-success" />}
        />
      </Button>
    </div>
  );
}
