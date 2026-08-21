import { type CommandDefinition } from "./types";

export const COMMAND_CATALOG = [
  {
    id: "palette.toggle",
    label: "Toggle command palette",
    description: "Open or close the command palette",
    group: "Global",
    scope: "global"
  },
  {
    id: "shortcuts.cheatsheet",
    label: "Show keyboard shortcuts",
    description: "Open a cheatsheet of current bindings",
    group: "Global",
    scope: "global"
  },
  {
    id: "panel.close",
    label: "Close details panel",
    description: "Dismiss the open inspect panel",
    group: "Global",
    scope: "palette-closed",
    gated: true
  },
  {
    id: "nav:home",
    label: "Home",
    description: "Open the public home page",
    group: "Pages",
    scope: "palette-closed"
  },
  {
    id: "nav:profile",
    label: "Profile",
    description: "Open your public profile",
    group: "Pages",
    scope: "palette-closed",
    gated: true
  },
  {
    id: "nav:repos",
    label: "Repositories",
    description: "Open the repositories list",
    group: "Pages",
    scope: "palette-closed",
    gated: true
  },
  {
    id: "nav:dashboard",
    label: "Agent",
    description: "Open the agent hub",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:onboarding",
    label: "Onboarding",
    description: "Open onboarding",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:experiences",
    label: "Experiences",
    description: "Open experiences",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:projects",
    label: "Projects",
    description: "Open projects",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:stacks",
    label: "Skills",
    description: "Open the skills catalog",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:resumes",
    label: "Resumes",
    description: "Open resumes",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:new-jobs",
    label: "New jobs",
    description: "Open new job discoveries",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:tracked-jobs",
    label: "Tracked jobs",
    description: "Open tracked applications",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:mail",
    label: "Mail",
    description: "Open career mail",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:settings",
    label: "Settings",
    description: "Open settings",
    group: "Agent",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-profile",
    label: "Settings: Profile",
    description: "Public identity and contacts",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-account",
    label: "Settings: Account",
    description: "Username, sessions, and sign-in",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-domain",
    label: "Settings: Domain",
    description: "Custom hostname",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-connections",
    label: "Settings: Integrations",
    description: "Gmail, GitHub, and inbound mail",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-rules",
    label: "Settings: Rules",
    description: "Smart mail categories",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-jobs",
    label: "Settings: Jobs",
    description: "Job board preferences",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-ai",
    label: "Settings: AI",
    description: "Providers and models",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-notifications",
    label: "Settings: Notifications",
    description: "Alert destinations",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-invites",
    label: "Settings: Invites",
    description: "Signup invite codes",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:settings-shortcuts",
    label: "Settings: Shortcuts",
    description: "Customize keyboard shortcuts",
    group: "Settings",
    scope: "palette-closed"
  },
  {
    id: "nav:playground",
    label: "Playground",
    description: "Open the playground",
    group: "Playground",
    scope: "palette-closed"
  },
  {
    id: "nav:playground-agent",
    label: "Agent Playground",
    description: "Open the agent playground",
    group: "Playground",
    scope: "palette-closed"
  },
  {
    id: "tabs.close",
    label: "Close current tab",
    description: "Close the active public GitHub tab",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.prev",
    label: "Previous tab",
    description: "Switch to the previous public GitHub tab",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.next",
    label: "Next tab",
    description: "Switch to the next public GitHub tab",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-1",
    label: "Tab 1",
    description: "Switch to public GitHub tab 1",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-2",
    label: "Tab 2",
    description: "Switch to public GitHub tab 2",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-3",
    label: "Tab 3",
    description: "Switch to public GitHub tab 3",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-4",
    label: "Tab 4",
    description: "Switch to public GitHub tab 4",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-5",
    label: "Tab 5",
    description: "Switch to public GitHub tab 5",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-6",
    label: "Tab 6",
    description: "Switch to public GitHub tab 6",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-7",
    label: "Tab 7",
    description: "Switch to public GitHub tab 7",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-8",
    label: "Tab 8",
    description: "Switch to public GitHub tab 8",
    group: "Tabs",
    scope: "tabs",
    gated: true
  },
  {
    id: "tabs.select-9",
    label: "Tab 9",
    description: "Switch to public GitHub tab 9",
    group: "Tabs",
    scope: "tabs",
    gated: true
  }
] as const satisfies readonly CommandDefinition[];

export const COMMAND_BY_ID = Object.fromEntries(
  COMMAND_CATALOG.map((command) => [command.id, command])
) as Record<CommandDefinition["id"], CommandDefinition>;

export function isCommandId(id: string): id is CommandDefinition["id"] {
  return Object.hasOwn(COMMAND_BY_ID, id);
}
