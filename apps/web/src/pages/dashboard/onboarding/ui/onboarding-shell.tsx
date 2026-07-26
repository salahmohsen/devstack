"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type OnboardingFlowStep = "upload" | "analyzing" | "review" | "done";

const STEPS: { id: OnboardingFlowStep; label: string; short: string }[] = [
  { id: "upload", label: "Upload", short: "1" },
  { id: "analyzing", label: "Analyze", short: "2" },
  { id: "review", label: "Review", short: "3" },
  { id: "done", label: "Done", short: "4" }
];

function stepIndex(step: OnboardingFlowStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function OnboardingStepIndicator({ step }: { step: OnboardingFlowStep }) {
  const current = stepIndex(step);

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((item, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px] shadow-primary/15",
                    !done && !active && "border-border bg-muted/40 text-muted-foreground"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <CheckIcon className="size-3.5" aria-hidden /> : item.short}
                </div>
                <span
                  className={cn(
                    "hidden truncate text-[11px] font-medium sm:block",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-0 h-px min-w-2 flex-1 sm:mb-5",
                    index < current ? "bg-primary/60" : "bg-border"
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
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0",
        className
      )}
    >
      <header className="flex flex-col gap-4">
        <OnboardingStepIndicator step={step} />
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>{children}</div>
    </div>
  );
}
