"use client";

import { KeyRound, Server, Users } from "lucide-react";

import { FeatureSection } from "@/shared/ui/feature-section";
import { Hero01 } from "@/shared/ui/hero-01";

import { ApplyLoopDiagram } from "./apply-loop-diagram";
import { FaqsSection } from "./faqs-section";
import { IntegrationsSection } from "./integrations-section";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

/**
 * Product home at `/` (community / OSS landing).
 *
 * THESIS: Self-hostable job-apply assistant. Freehire-only discovery, tracked
 * pipeline, hub agent on BYO keys, public evidence on /{username}.
 * OWN-WORLD: App tokens + @ncdai/hero-01; quiet feature cards; Efferd
 * integrations / faqs / cta / footer adapted to PRODUCT.md facts.
 * FIRST VIEWPORT: hero-01 (Find. Track. Apply.) with Create account / Sign in.
 */
export function CommunityLandingPage() {
  return (
    <div className="relative w-full min-w-0 overflow-x-hidden">
      <Hero01 />
      <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-14 px-4 pt-10 pb-8 sm:gap-16 sm:px-6 sm:pt-12 sm:pb-10">
        <ApplyLoopDiagram />
        <FeatureSection className="px-0 py-0 md:px-0 md:py-0" />
        <IntegrationsSection />
        <SelfHostStrip />
        <FaqsSection />
        <LandingCta />
        <LandingFooter />
      </div>
    </div>
  );
}

function SelfHostStrip() {
  return (
    <section className="flex min-w-0 flex-col gap-4 border-t border-border/80 pt-10 sm:pt-12">
      <div className="flex max-w-2xl min-w-0 flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Run the install yourself
        </h2>
        <p className="text-sm leading-relaxed wrap-break-word text-muted-foreground sm:text-base">
          MIT monorepo on Docker Compose or Dokploy. First user bootstraps the empty database; later
          signup follows invite-only or open. Seal BYO AI (and optional BYO Resend) per tenant.
        </p>
      </div>
      <ul className="grid min-w-0 gap-3 sm:grid-cols-3">
        <li className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card/50 p-4">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold">Invite-gated tenancy</span>
          <span className="text-sm wrap-break-word text-muted-foreground">
            Super admin manages named invites and signup mode.
          </span>
        </li>
        <li className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card/50 p-4">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold">Your keys</span>
          <span className="text-sm wrap-break-word text-muted-foreground">
            Missing AI keys degrade model steps; CRUD still works.
          </span>
        </li>
        <li className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card/50 p-4">
          <Server className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold">Your infra</span>
          <span className="text-sm wrap-break-word text-muted-foreground">
            You terminate TLS for custom domains; the app routes by Host.
          </span>
        </li>
      </ul>
    </section>
  );
}
