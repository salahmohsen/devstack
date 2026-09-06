import { Bot, Briefcase, Globe2, Radar } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

type FeatureType = {
  title: string;
  icon: ReactNode;
  description: string;
};

/**
 * Landing features grid — quiet cards aligned with the rest of the page.
 * Structure adapted from @efferd/features-4 without extended border chrome.
 */
export function FeatureSection({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-5xl min-w-0 flex-col justify-center gap-8 px-4 py-12 md:gap-10 md:px-8 md:py-16",
        className
      )}
    >
      <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          What you get
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          Freehire-fed discovery, a tracked pipeline, a Mastra hub agent on your keys, and a public
          profile for evidence you opt in.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  className,
  ...props
}: ComponentProps<"div"> & {
  feature: FeatureType;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border bg-card/50 p-4 sm:p-5",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg border bg-muted/20",
          "[&_svg]:size-5 [&_svg]:stroke-[1.5] [&_svg]:text-foreground"
        )}
      >
        {feature.icon}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
        <p className="text-sm leading-relaxed wrap-break-word text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

const features: FeatureType[] = [
  {
    title: "New jobs from boards",
    icon: <Radar />,
    description:
      "Public listings from Freehire rank to your prefs, then score with your BYO AI key. Mail harvest is optional."
  },
  {
    title: "Tracked jobs + mail",
    icon: <Briefcase />,
    description:
      "Promote roles into a CRM board. Career Inbox classifies hiring mail and can move stages with undo."
  },
  {
    title: "Hub agent on your keys",
    icon: <Bot />,
    description:
      "Mastra chat uses the same objects as the dashboard. Seal providers in Settings → AI. HITL gates hard writes."
  },
  {
    title: "Evidence, public site",
    icon: <Globe2 />,
    description:
      "Experiences, projects, skills, and generated resumes on /{username} or a verified custom domain."
  }
];
