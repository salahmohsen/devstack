"use client";

import { type DirectiveChipProps } from "@assistant-ui/react-lexical";
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

/** Inline chip for LexicalComposerInput — matches chat HubDirectiveText badges. */
export function HubComposerDirectiveChip({
  directiveId,
  directiveType,
  label
}: DirectiveChipProps) {
  const Icon = HUB_DIRECTIVE_ICONS[directiveType] ?? HUB_DIRECTIVE_ICONS[directiveId] ?? WrenchIcon;

  return (
    <span
      data-slot="directive-text-chip"
      data-directive-type={directiveType}
      data-directive-id={directiveId}
      aria-label={`${directiveType}: ${label}`}
      className={cn(
        "aui-directive-chip mx-0.5 inline-flex max-w-full items-center gap-1 rounded-md align-middle",
        "bg-blue-100 px-1.5 py-0.5 text-[13px] leading-none font-medium text-blue-700",
        "dark:bg-blue-900/50 dark:text-blue-300"
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
