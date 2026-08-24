import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { DecorIcon } from "@/shared/ui/decor-icon";

/**
 * Closing CTA — structure from @efferd/cta-3.
 * No trial/sales language; Create account / Sign in match the hero.
 */
export function LandingCta({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative mx-auto flex w-full max-w-3xl min-w-0 flex-col justify-between gap-4 border-y px-4 pt-12 pb-8 sm:gap-5 sm:pt-14 sm:pb-10",
        "dark:bg-[radial-gradient(35%_80%_at_25%_0%,--theme(--color-foreground/.08),transparent)]",
        className
      )}
    >
      <DecorIcon className="size-4" position="top-left" />
      <DecorIcon className="size-4" position="top-right" />
      <DecorIcon className="size-4" position="bottom-left" />
      <DecorIcon className="size-4" position="bottom-right" />

      <div className="pointer-events-none absolute -inset-y-6 -left-px w-px border-l" />
      <div className="pointer-events-none absolute -inset-y-6 -right-px w-px border-r" />

      <h2 className="text-center text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
        Start on your own stack
      </h2>
      <p className="mx-auto max-w-lg text-center text-sm leading-relaxed text-balance text-muted-foreground sm:text-base">
        Create an account on this install, or sign in if you already have one. Public pages stay at{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] break-all">
          /{"{username}"}
        </code>
        .
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <Button render={<Link to="/sign-in/create-an-account" />}>
          Create an account
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="outline" render={<Link to="/sign-in" />}>
          Sign in
        </Button>
      </div>
    </section>
  );
}
