/**
 * Hub composer `/` slash commands and `@` tool mentions.
 * Labels stay everyday; inserted text is what the model receives.
 */

export type HubToolMention = {
  id: string;
  label: string;
  description: string;
  /** Everyday prompt inserted into the composer. */
  insertText: string;
  icon?: string;
};

/** @-mentionable hub capabilities (not raw tool ids). */
export const HUB_TOOL_MENTIONS: readonly HubToolMention[] = [
  {
    id: "today",
    label: "Today",
    description: "What's new in the last day",
    insertText: "what do you have today?",
    icon: "Calendar"
  },
  {
    id: "job-rules",
    label: "Job rules",
    description: "What I'm looking for / search brief",
    insertText: "show me my job rules",
    icon: "FileText"
  },
  {
    id: "skills",
    label: "Skills",
    description: "Stacks and tools on file",
    insertText: "show me my skills list",
    icon: "Wrench"
  },
  {
    id: "pile",
    label: "New jobs",
    description: "Inbox / pile status",
    insertText: "anything new in the pile?",
    icon: "Briefcase"
  },
  {
    id: "mail",
    label: "Mail",
    description: "Important email",
    insertText: "any mail that matters?",
    icon: "Mail"
  },
  {
    id: "experiences",
    label: "Experience",
    description: "Work history",
    insertText: "show me my latest experience",
    icon: "User"
  },
  {
    id: "projects",
    label: "Projects",
    description: "Portfolio projects",
    insertText: "show me my latest project",
    icon: "Folder"
  },
  {
    id: "find-jobs",
    label: "Find jobs",
    description: "Kick off a job search",
    insertText: "find me jobs now",
    icon: "Search"
  }
];

export type HubSlashCommandId = "new" | "today" | "rules" | "skills" | "pile" | "mail";

export const HUB_SLASH_COMMAND_META: ReadonlyArray<{
  id: HubSlashCommandId;
  description: string;
  icon: string;
  /** Prompt to insert (except `/new` which only runs an action). */
  insertText?: string;
}> = [
  {
    id: "new",
    description: "Start a fresh chat (clears sticky memory)",
    icon: "MessageSquarePlus"
  },
  {
    id: "today",
    description: "What's new today",
    icon: "Calendar",
    insertText: "what do you have today?"
  },
  {
    id: "rules",
    description: "Open my job rules",
    icon: "FileText",
    insertText: "show me my job rules"
  },
  {
    id: "skills",
    description: "List my skills",
    icon: "Wrench",
    insertText: "show me my skills list"
  },
  {
    id: "pile",
    description: "Check the new jobs pile",
    icon: "Briefcase",
    insertText: "anything new in the pile?"
  },
  {
    id: "mail",
    description: "Mail that matters",
    icon: "Mail",
    insertText: "any mail that matters?"
  }
];
