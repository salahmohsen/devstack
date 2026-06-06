import { useQuery } from "@tanstack/react-query";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { Container } from "@/shared/ui/container";

export function DashboardPage() {
  const { user } = useAuthSuspense();
  const appSettingsQuery = useQuery(orpc.appSettings.get.queryOptions());

  if (appSettingsQuery.isLoading && !appSettingsQuery.data) {
    return (
      <Container className="py-16">
        <Spinner className="mx-auto" />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  const appSettings = appSettingsQuery.data;
  const hasGithubToken = appSettings?.hasGithubToken ?? false;
  const updatedAt = appSettings?.updatedAt
    ? new Date(appSettings.updatedAt).toLocaleString()
    : null;

  return (
    <div className="min-w-0 space-y-8">
      <section className="border-b border-border pb-6" id="overview">
        <p className="text-sm text-muted-foreground">Overview</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Review the current GitHub integration state for your portfolio. Edit credentials from
          GitHub Config under Settings.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Signed in as {user.email}</p>
      </section>

      <section className="grid gap-px border border-border bg-border lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
        <aside className="bg-background p-6">
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground">Integration Status</p>
            <h2 className="mt-2 text-xl font-medium">Current Snapshot</h2>
          </div>
          <dl className="mt-8 grid gap-6 text-sm sm:grid-cols-3 sm:gap-4">
            <div className="space-y-1">
              <dt className="text-muted-foreground">GitHub username</dt>
              <dd className="font-medium">{appSettings?.githubUsername ?? "Not configured"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">GitHub token</dt>
              <dd className="font-medium">{hasGithubToken ? "Configured" : "Missing"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="font-medium">{updatedAt ?? "Never"}</dd>
            </div>
          </dl>
        </aside>

        <aside className="bg-muted/20 p-6">
          <p className="text-sm text-muted-foreground">Security</p>
          <h2 className="mt-2 text-xl font-medium">Write-only Storage</h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>The stored token is never read back into the browser.</li>
            <li>Leaving the token blank keeps the current value unchanged.</li>
            <li>Use clear when you want to disconnect public GitHub reads.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
