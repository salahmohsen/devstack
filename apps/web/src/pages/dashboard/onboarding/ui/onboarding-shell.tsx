"use client";

import { CheckIcon } from "lucide-react";

import { Badge } from "@tsu-stack/ui/components/badge";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ONBOARDING_DESTINATION_STEPS, type OnboardingFlowStep } from "@/features/onboarding";

export type { OnboardingFlowStep };

const MARK_EASE = "duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none";

function destinationIndex(step: OnboardingFlowStep): number {
  return ONBOARDING_DESTINATION_STEPS.findIndex((item) =>
    (item.matches as readonly string[]).includes(step)
  );
}

function StepNumber({ index, done, active }: { index: number; done: boolean; active: boolean }) {
  return (
    <Badge
      size="lg"
      variant={done ? "default" : active ? "default" : "outline"}
      aria-hidden
      className={cn(
        "size-7 rounded-full p-0 font-sans text-[11px] tabular-nums",
        done && "border-primary/50 bg-primary text-primary-foreground",
        active && "border-foreground bg-foreground text-background",
        !done && !active && "bg-background text-muted-foreground"
      )}
    >
      <span className="relative flex size-3.5 items-center justify-center">
        <CheckIcon
          className={cn(
            "absolute size-3.5 transition-[opacity,transform,filter]",
            MARK_EASE,
            done ? "blur-0 scale-100 opacity-100" : "scale-[0.25] opacity-0 blur-xs"
          )}
        />
        <span
          className={cn(
            "leading-none transition-[opacity,transform,filter]",
            MARK_EASE,
            done ? "scale-[0.25] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100"
          )}
        >
          {index + 1}
        </span>
      </span>
    </Badge>
  );
}

export function OnboardingStepIndicator({ step }: { step: OnboardingFlowStep }) {
  const current = destinationIndex(step);

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex w-full items-center">
        {ONBOARDING_DESTINATION_STEPS.map((item, index) => {
          const done = index < current;
          const active = index === current;
          const isLast = index === ONBOARDING_DESTINATION_STEPS.length - 1;
          return (
            <li
              key={item.id}
              className={cn("flex items-center", isLast ? "shrink-0" : "min-w-0 flex-1")}
            >
              <div
                className="flex shrink-0 items-center gap-2"
                aria-current={active ? "step" : undefined}
              >
                <StepNumber index={index} done={done} active={active} />
                <span className="sr-only">
                  {done
                    ? `${item.label}, completed`
                    : active
                      ? `${item.label}, current step`
                      : item.label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "hidden text-sm sm:inline",
                    active && "font-medium text-foreground",
                    done && "text-foreground/70",
                    !done && !active && "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
              {isLast ? null : (
                <div
                  className={cn(
                    "mx-2 h-px min-w-3 flex-1 sm:mx-3 sm:min-w-4",
                    index < current ? "bg-foreground/35" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground sm:hidden" aria-hidden>
        {ONBOARDING_DESTINATION_STEPS[Math.max(0, current)]?.label} · {current + 1} of{" "}
        {ONBOARDING_DESTINATION_STEPS.length}
      </p>
    </nav>
  );
}

export function OnboardingShell({
  step,
  title,
  description,
  children,
  className,
  contentClassName
}: {
  step: OnboardingFlowStep;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  // Review, connect, and analyzing use the full content width — they render
  // the document-first two-column layout (paper + side column).
  const isFullBleed = step === "review" || step === "connect" || step === "analyzing";
  const contentMax = isFullBleed
    ? "max-w-none"
    : step === "upload" || step === "jobs"
      ? "max-w-none"
      : step === "done"
        ? "max-w-lg"
        : "max-w-xl";

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-6 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0 sm:gap-8",
        className
      )}
    >
      <header className="flex w-full flex-col gap-5 sm:gap-8">
        <OnboardingStepIndicator step={step} />
        <div className={cn("space-y-1.5", isFullBleed ? "w-full" : "w-full max-w-2xl")}>
          <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className={cn("flex min-h-0 w-full flex-1 flex-col", contentMax, contentClassName)}>
        {children}
      </div>
    </div>
  );
}
