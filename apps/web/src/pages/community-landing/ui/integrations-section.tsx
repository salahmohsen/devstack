import { Bot, Briefcase } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";
import { SiGithub, SiResend } from "react-icons/si";

import { cn } from "@tsu-stack/ui/lib/utils";

import { DecorIcon } from "@/shared/ui/decor-icon";

type Integration = {
  name: string;
  description: string;
  icon: ReactNode;
  corner?: ReactNode;
};

/**
 * Product connectors grid — structure from @efferd/integrations-2.
 * Copy sticks to the integrations and BYO services the app actually wires.
 */
export function IntegrationsSection({ className }: { className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-6", className)}>
      <div className="flex max-w-2xl min-w-0 flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Connects to what you already use
        </h2>
        <p className="text-sm leading-relaxed wrap-break-word text-muted-foreground sm:text-base">
          Freehire listings fill New jobs. Your optional Resend account feeds Career Inbox. GitHub
          powers the public repos surface. Model calls use keys you seal in Settings.
        </p>
      </div>

      <div className="relative min-w-0 border">
        <div className="grid min-w-0 grid-cols-1 gap-px bg-border sm:grid-cols-2 md:grid-cols-3">
          {integrations.map((item) => (
            <IntegrationCard integration={item} key={item.name}>
              {item.corner}
            </IntegrationCard>
          ))}
        </div>
        <DecorIcon position="top-left" />
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <DecorIcon position="bottom-right" />
      </div>
    </section>
  );
}

function IntegrationCard({
  integration,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  integration: Integration;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col items-start gap-3 bg-background p-4 text-start sm:gap-4 sm:p-5 even:md:bg-background/75",
        className
      )}
      {...props}
    >
      <div className="flex size-8 shrink-0 items-center justify-center text-foreground [&_svg]:size-7">
        {integration.icon}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
        <p className="text-xs leading-relaxed wrap-break-word text-muted-foreground sm:text-sm">
          {integration.description}
        </p>
      </div>
      {children}
    </div>
  );
}

const integrations: Integration[] = [
  {
    name: "Resend",
    description:
      "Optionally connect your own Resend account to receive career mail, classify it, and reply.",
    icon: <SiResend aria-hidden />,
    corner: <DecorIcon position="bottom-left" />
  },
  {
    name: "GitHub",
    description:
      "Public repos and README surfaces use that tenant's OAuth token server-side, never a global PAT.",
    // Monochrome mark: inherit text-foreground (white in dark, dark in light).
    // Do not use dark:invert here — that flips an already-light currentColor fill to black.
    icon: <SiGithub aria-hidden className="fill-current" />
  },
  {
    name: "Freehire",
    description:
      "Public listings from freehire.me fetch per user, rank against your prefs, then land in New jobs.",
    icon: <Briefcase aria-hidden className="size-7 stroke-[1.5]" />
  },
  {
    name: "BYO AI",
    description:
      "Seal provider keys in Settings → AI. Mastra hub and scoring use your budget; missing keys skip model steps.",
    icon: <Bot aria-hidden className="size-7 stroke-[1.5]" />
  }
];
