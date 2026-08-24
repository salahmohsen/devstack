"use client";

import { Briefcase, Globe2, Package, Radar } from "lucide-react";
import { useRef, type RefObject } from "react";

import { AnimatedBeam } from "@tsu-stack/ui/components/animated-beam";
import { cn } from "@tsu-stack/ui/lib/utils";

const STAGES = [
  {
    id: "discover",
    label: "New jobs",
    detail: "Public boards via adapters. Optional mail harvest.",
    icon: Radar
  },
  {
    id: "track",
    label: "Tracked jobs",
    detail: "CRM board through offer. Inbox can move stages.",
    icon: Briefcase
  },
  {
    id: "package",
    label: "Apply package",
    detail: "Resume, cover letter, outreach with human review.",
    icon: Package
  },
  {
    id: "publish",
    label: "Public profile",
    detail: "Opted-in evidence on /{username}.",
    icon: Globe2
  }
] as const;

/**
 * Synthetic apply-loop diagram for the product landing.
 * Adapter-first discovery; mail is an optional channel, not the only source.
 */
export function ApplyLoopDiagram({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const publishRef = useRef<HTMLDivElement>(null);
  const stageRefs: RefObject<HTMLDivElement | null>[] = [
    discoverRef,
    trackRef,
    packageRef,
    publishRef
  ];

  const beams: Array<{
    id: string;
    from: RefObject<HTMLDivElement | null>;
    to: RefObject<HTMLDivElement | null>;
    curvature: number;
    delay: number;
  }> = [
    { id: "discover-track", from: discoverRef, to: trackRef, curvature: -12, delay: 0 },
    { id: "track-package", from: trackRef, to: packageRef, curvature: 12, delay: 0.35 },
    { id: "package-publish", from: packageRef, to: publishRef, curvature: -12, delay: 0.7 }
  ];

  return (
    <div
      className={cn("min-w-0 overflow-hidden rounded-xl border bg-card/60 p-4 sm:p-6", className)}
    >
      <p className="mb-5 text-sm font-medium text-foreground">How work moves through DEVSTACK</p>

      {/* containerRef = SVG offset parent; must match AnimatedBeam's absolute ancestor */}
      <div ref={containerRef} className="relative grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              ref={stageRefs[index]}
              className="relative z-10 flex min-w-0 flex-col gap-2 rounded-xl border bg-background/80 p-3 sm:p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.65rem] tracking-wider text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">{stage.label}</p>
              <p className="text-xs leading-relaxed wrap-break-word text-muted-foreground">
                {stage.detail}
              </p>
            </div>
          );
        })}

        {beams.map((beam) => (
          <AnimatedBeam
            key={beam.id}
            containerRef={containerRef}
            fromRef={beam.from}
            toRef={beam.to}
            curvature={beam.curvature}
            pathColor="var(--border)"
            pathOpacity={0.4}
            gradientStartColor="var(--brand)"
            gradientStopColor="var(--primary)"
            duration={4}
            delay={beam.delay}
            className="pointer-events-none hidden overflow-hidden lg:block"
          />
        ))}
      </div>
    </div>
  );
}
