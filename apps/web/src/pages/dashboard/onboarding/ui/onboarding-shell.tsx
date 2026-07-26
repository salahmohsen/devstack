"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { type OnboardingFlowStep } from "@/features/onboarding";

export type { OnboardingFlowStep };

const STEPS: { id: OnboardingFlowStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "analyzing", label: "Analyze" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" }
];

function stepIndex(step: OnboardingFlowStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function OnboardingStepIndicator({ step }: { step: OnboardingFlowStep }) {
  const current = stepIndex(step);

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex w-full items-center">
        {STEPS.map((item, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors duration-150 motion-reduce:transition-none",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-foreground text-background",
                    !done && !active && "bg-muted text-muted-foreground"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-[11px] sm:block",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-0 h-px min-w-4 flex-1 sm:mb-5",
                    index < current ? "bg-foreground/30" : "bg-border"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
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
  // Review uses the full content width (multi-column item grids).
  // Other steps keep a focused reading measure.
  const isFullBleed = step === "review";
  const contentMax = isFullBleed ? "max-w-none" : step === "done" ? "max-w-lg" : "max-w-xl";

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col gap-6 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0 sm:gap-8",
        className
      )}
    >
      <header className="flex w-full flex-col gap-5 sm:gap-10">
        <OnboardingStepIndicator step={step} />
        <div
          className={cn(
            "space-y-1.5",
            isFullBleed ? "w-full" : "mx-auto w-full max-w-xl text-center sm:text-left",
            isFullBleed && "sm:text-left"
          )}
        >
          <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col",
          !isFullBleed && "mx-auto",
          contentMax,
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
