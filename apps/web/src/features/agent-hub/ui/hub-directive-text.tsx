"use client";

import {
  unstable_defaultDirectiveFormatter,
  type TextMessagePartComponent
} from "@assistant-ui/react";
import {
  BriefcaseIcon,
  CalendarIcon,
  FileTextIcon,
  FolderIcon,
  MailIcon,
  SearchIcon,
  UserIcon,
  WrenchIcon,
  type LucideIcon
} from "lucide-react";
import { memo } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

const HUB_DIRECTIVE_ICONS: Record<string, LucideIcon> = {
  "hub-tool": WrenchIcon,
  tool: WrenchIcon,
  today: CalendarIcon,
  "job-rules": FileTextIcon,
  skills: WrenchIcon,
  pile: BriefcaseIcon,
  mail: MailIcon,
  experiences: UserIcon,
  projects: FolderIcon,
  "find-jobs": SearchIcon
};

/**
 * User-message Text renderer: turns `:hub-tool[Label]{name=id}` into chips.
 * Matches the default composer @-mention insert format.
 */
function HubDirectiveTextImpl({ text }: { text: string }) {
  const segments = unstable_defaultDirectiveFormatter.parse(text);

  if (segments.length === 1 && segments[0]?.kind === "text") {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {seg.text}
            </span>
          );
        }

        const Icon = HUB_DIRECTIVE_ICONS[seg.type] ?? HUB_DIRECTIVE_ICONS[seg.id] ?? WrenchIcon;
        return (
          <span
            key={i}
            data-slot="directive-text-chip"
            data-directive-type={seg.type}
            data-directive-id={seg.id}
            aria-label={`${seg.type}: ${seg.label}`}
            className={cn(
              "aui-directive-chip mx-0.5 inline-flex items-center gap-1 rounded-md",
              "bg-blue-100 px-1.5 py-0.5 text-[13px] leading-none font-medium text-blue-700",
              "dark:bg-blue-900/50 dark:text-blue-300"
            )}
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            {seg.label}
          </span>
        );
      })}
    </>
  );
}

export const HubDirectiveText: TextMessagePartComponent = memo(HubDirectiveTextImpl);
