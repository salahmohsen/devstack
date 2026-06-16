import { Badge } from "@tsu-stack/ui/components/badge";

type RepoSidebarProps = {
  repo: {
    branchCount: number;
    hasDiscussions: boolean;
    license: string | null;
    openIssueCount: number;
    openPullCount: number;
    topics: string[];
    watchers: number;
  };
};

export function RepoSidebar({ repo }: RepoSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-sm font-semibold text-base-200">Repository details</h3>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <SidebarRow label="Branches" value={repo.branchCount} />
          <SidebarRow label="Watchers" value={repo.watchers} />
          <SidebarRow label="Open pull requests" value={repo.openPullCount} />
          <SidebarRow label="Open issues" value={repo.openIssueCount} />
          {repo.license ? <SidebarTextRow label="License" value={repo.license} /> : null}
          <SidebarTextRow
            label="Discussions"
            value={repo.hasDiscussions ? "Enabled" : "Disabled"}
          />
        </div>
      </div>

      {repo.topics.length > 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <h3 className="text-sm font-semibold text-base-200">Topics</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {repo.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="border-white/10 text-base-300">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function SidebarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium text-white">{value.toLocaleString()}</span>
    </div>
  );
}

function SidebarTextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
