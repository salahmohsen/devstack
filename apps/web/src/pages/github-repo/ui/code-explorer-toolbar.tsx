import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Code, Copy, Download, GitPullRequest } from "lucide-react";
import { useCallback, useState } from "react";

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
import { Popover, PopoverContent, PopoverTrigger } from "@tsu-stack/ui/components/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useRepoCloneProtocol } from "@/shared/lib/repo-clone-protocol-storage";

import { getGithubRepoBranchesQueryOptions } from "@/pages/github-repo/api/get-github-repo-branches.query";

export function CodeExplorerToolbar({
  currentRef,
  onBranchChange,
  repo
}: {
  currentRef: string;
  onBranchChange: (branch: string) => void;
  repo: RepoOverview;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <BranchSelector currentRef={currentRef} onBranchChange={onBranchChange} repo={repo} />
      <CodePopover repo={repo} />
    </div>
  );
}

function BranchSelector({
  currentRef,
  onBranchChange,
  repo
}: {
  currentRef: string;
  onBranchChange: (branch: string) => void;
  repo: RepoOverview;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const branchesOptions = getGithubRepoBranchesQueryOptions(repo.name);

  const branchesQuery = useQuery({
    ...branchesOptions,
    enabled: open
  });

  const prefetchBranches = useCallback(async () => {
    void queryClient.prefetchQuery(branchesOptions);
  }, [queryClient, branchesOptions]);

  const defaultBranch = repo.defaultBranch ?? "main";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="secondary"
          size="sm"
          onMouseEnter={prefetchBranches}
          onFocus={prefetchBranches}
          className="max-w-55 border border-border dark:border-transparent"
        >
          <GitPullRequest size={14} />
          <span className="truncate">{currentRef}</span>
          <ChevronDown size={14} className="shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a branch…" />
          <CommandList>
            <CommandEmpty>
              {branchesQuery.isLoading ? "Loading…" : "No branches found."}
            </CommandEmpty>
            <CommandItem
              key={defaultBranch}
              onClick={() => {
                onBranchChange(defaultBranch);
                setOpen(false);
              }}
              className={cn(defaultBranch === currentRef && "font-medium text-foreground")}
            >
              <Check
                size={14}
                className={cn(
                  "shrink-0",
                  defaultBranch === currentRef ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{defaultBranch}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">default</span>
            </CommandItem>
            {branchesQuery.data
              ?.filter((b) => b.name !== defaultBranch)
              .map((branch) => (
                <CommandItem
                  key={branch.name}
                  onClick={() => {
                    onBranchChange(branch.name);
                    setOpen(false);
                  }}
                  className={cn(branch.name === currentRef && "font-medium text-foreground")}
                >
                  <Check
                    size={14}
                    className={cn(
                      "shrink-0",
                      branch.name === currentRef ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{branch.name}</span>
                </CommandItem>
              ))}
          </CommandList>
        </Command>
        <div className="border-t px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {repo.branchCount} branch{repo.branchCount !== 1 ? "es" : ""}
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
            <FrameTitle>Clone {repo.fullName}</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <Tabs value={selectedProtocol} onValueChange={handleProtocolChange} className="gap-0">
              <TabsList className="h-8 w-fit">
                <TabsTrigger value="https">HTTPS</TabsTrigger>
                <TabsTrigger value="ssh">SSH</TabsTrigger>
                <TabsTrigger value="cli">CLI</TabsTrigger>
              </TabsList>

              <TabsContent value="https" className="py-4">
                <CloneInput copied={copied} onCopy={() => handleCopy(httpsUrl)} value={httpsUrl} />
                <p className="mt-1.5 text-xs text-muted-foreground">Clone using the web URL.</p>
              </TabsContent>
              <TabsContent value="ssh" className="px-4 pt-4 pb-3">
                <CloneInput copied={copied} onCopy={() => handleCopy(sshUrl)} value={sshUrl} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Use a password-protected SSH key.
                </p>
              </TabsContent>
              <TabsContent value="cli" className="px-4 pt-4 pb-3">
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
    <div className="flex items-center gap-1.5">
      <code className="flex-1 truncate rounded-md border bg-surface-1 px-2.5 py-1.5 text-xs">
        {value}
      </code>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onCopy}>
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
      </Button>
    </div>
  );
}
