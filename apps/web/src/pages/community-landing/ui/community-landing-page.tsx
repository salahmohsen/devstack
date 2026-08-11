import { Link } from "@tanstack/react-router";
import { ArrowRight, GitBranch, Server, Users } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";

import { appConfig } from "@/config/app.config";

/**
 * Minimal community / OSS landing for `/`.
 * Portfolios live at `/{username}` — this page is not a SaaS pitch.
 */
export function CommunityLandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-4">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Open source · self-host
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Personal hub for developers
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          Run your own portfolio, resume, and project stack on infrastructure you control. Public
          pages live at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
            /{"{username}"}
          </code>
          .
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3">
        <Feature
          icon={Server}
          title="Self-host"
          body="Deploy the monorepo on your own stack. No multi-tenant SaaS lock-in."
        />
        <Feature
          icon={Users}
          title="Multi-user"
          body="Invite-gated accounts. Each person gets a public profile path."
        />
        <Feature
          icon={GitBranch}
          title="Open source"
          body={`${appConfig.site.shortName} is built to be forked, read, and extended.`}
        />
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button render={<Link to="/sign-in" />}>
          Sign in
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="outline" render={<Link to="/sign-in/create-an-account" />}>
          Create an account
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Already have a profile? Open{" "}
        <span className="font-medium text-foreground">/{`{your-username}`}</span> directly.
      </p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Server;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card/40 p-4">
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
