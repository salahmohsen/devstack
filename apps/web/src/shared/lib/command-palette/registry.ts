import {
  Bell,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Filter,
  FlaskConical,
  FolderKanban,
  Home,
  Inbox,
  KeyRound,
  Layers,
  Link2,
  ListChecks,
  Mail,
  Rocket,
  Settings,
  Sparkles,
  UserPlus,
  UserRound
} from "lucide-react";

import { type CommandItem } from "./types";

let commands: CommandItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function registerCommands(items: CommandItem[]): () => void {
  commands = [...commands, ...items];
  emit();
  return () => {
    const ids = new Set(items.map((i) => i.id));
    commands = commands.filter((c) => !ids.has(c.id));
    emit();
  };
}

export function getRegisteredCommands(): CommandItem[] {
  return commands;
}

export function subscribeCommands(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Static palette destinations.
 *
 * Shortcut convention: chord `D` + first letter of the destination noun
 * (e.g. Home → D H, Repositories → D R, Projects → D P).
 * When two destinations share a letter, use the next distinctive consonant
 * from the noun (Resumes → C for CV, Review → V, Stack → T, Profile → F).
 *
 * Protected routes set `authRequired` and are filtered out when signed out.
 * Dynamic Profile / Repositories chords live in `use-command-items.ts`.
 */
registerCommands([
  // —— Public ——
  {
    id: "nav:home",
    label: "Go to Home",
    group: "Pages",
    icon: Home,
    keywords: ["home", "landing", "portfolio"],
    shortcut: ["D", "H"],
    action: { type: "navigate", to: "/" }
  },

  // —— Dashboard (auth) ——
  {
    id: "nav:dashboard",
    label: "Go to Dashboard",
    group: "Dashboard",
    icon: Bot,
    keywords: ["agent", "hub", "home", "dashboard"],
    shortcut: ["D", "D"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard" }
  },
  {
    id: "nav:onboarding",
    label: "Go to Onboarding",
    group: "Dashboard",
    icon: Rocket,
    keywords: ["onboarding", "setup", "getting started"],
    shortcut: ["D", "O"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/onboarding" }
  },
  {
    id: "nav:experiences",
    label: "Go to Experiences",
    group: "Dashboard",
    icon: Briefcase,
    keywords: ["experience", "work", "jobs", "career"],
    shortcut: ["D", "E"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/experiences" }
  },
  {
    id: "nav:projects",
    label: "Go to Projects",
    group: "Dashboard",
    icon: FolderKanban,
    keywords: ["projects", "portfolio", "work"],
    shortcut: ["D", "P"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/projects" }
  },
  {
    id: "nav:stacks",
    label: "Go to Stack",
    group: "Dashboard",
    icon: Layers,
    keywords: ["stack", "tech", "skills", "tools"],
    // S taken by Settings → sTack
    shortcut: ["D", "T"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/stacks" }
  },
  {
    id: "nav:resumes",
    label: "Go to Resumes",
    group: "Dashboard",
    icon: FileText,
    keywords: ["resume", "cv", "document"],
    // R taken by Repositories → CV
    shortcut: ["D", "C"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/resumes" }
  },
  {
    id: "nav:new-jobs",
    label: "Go to New jobs",
    group: "Dashboard",
    icon: Sparkles,
    keywords: ["new jobs", "discoveries", "inbox", "harvest", "job alerts"],
    shortcut: ["D", "N"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/new-jobs" }
  },
  {
    id: "nav:tracked-jobs",
    label: "Go to Tracked jobs",
    group: "Dashboard",
    icon: ListChecks,
    keywords: ["tracked", "applications", "jobs", "pipeline", "crm", "seeker"],
    shortcut: ["D", "A"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/tracked-jobs" }
  },
  {
    id: "nav:mail",
    label: "Go to Mail",
    group: "Dashboard",
    icon: Mail,
    keywords: ["mail", "inbox", "email", "career"],
    shortcut: ["D", "M"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/mail/applications" }
  },
  {
    id: "nav:review",
    label: "Go to Review",
    group: "Dashboard",
    icon: Inbox,
    keywords: ["review", "queue", "approvals"],
    // R taken by Repositories → reView
    shortcut: ["D", "V"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/review" }
  },
  {
    id: "nav:settings",
    label: "Go to Settings",
    group: "Dashboard",
    icon: Settings,
    keywords: ["settings", "preferences", "config"],
    shortcut: ["D", "S"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/profile" }
  },

  // —— Settings subpages (auth) ——
  {
    id: "nav:settings-profile",
    label: "Settings: Profile",
    group: "Settings",
    icon: UserRound,
    keywords: ["profile", "identity", "contacts", "public"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/profile" }
  },
  {
    id: "nav:settings-account",
    label: "Settings: Account",
    group: "Settings",
    icon: KeyRound,
    keywords: ["account", "sessions", "security", "sign-in"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/account" }
  },
  {
    id: "nav:settings-domain",
    label: "Settings: Domain",
    group: "Settings",
    icon: Building2,
    keywords: ["domain", "custom", "hostname", "dns"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/domain" }
  },
  {
    id: "nav:settings-mail",
    label: "Settings: Mail",
    group: "Settings",
    icon: Inbox,
    keywords: ["mail", "resend", "inbound", "byo"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/mail" }
  },
  {
    id: "nav:settings-connections",
    label: "Settings: Connections",
    group: "Settings",
    icon: Link2,
    keywords: ["connections", "google", "gmail", "github", "oauth"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/connections" }
  },
  {
    id: "nav:settings-rules",
    label: "Settings: Rules",
    group: "Settings",
    icon: Filter,
    keywords: ["rules", "categories", "keywords", "filters"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/rules" }
  },
  {
    id: "nav:settings-jobs",
    label: "Settings: Jobs",
    group: "Settings",
    icon: Briefcase,
    keywords: ["jobs", "alerts", "preferences", "filter"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/jobs" }
  },
  {
    id: "nav:settings-ai",
    label: "Settings: AI",
    group: "Settings",
    icon: Sparkles,
    keywords: ["ai", "models", "providers", "autonomy"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/ai" }
  },
  {
    id: "nav:settings-notifications",
    label: "Settings: Notifications",
    group: "Settings",
    icon: Bell,
    keywords: ["notifications", "alerts", "channels"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/notifications" }
  },
  {
    id: "nav:settings-invites",
    label: "Settings: Invites",
    group: "Settings",
    icon: UserPlus,
    keywords: ["invites", "signup", "codes", "access"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/invites" }
  },

  // —— Playground (auth) ——
  {
    id: "nav:playground",
    label: "Go to Playground",
    group: "Playground",
    icon: FlaskConical,
    keywords: ["playground", "dev", "experiments"],
    authRequired: true,
    action: { type: "navigate", to: "/playground" }
  },
  {
    id: "nav:playground-agent",
    label: "Go to Agent Playground",
    group: "Playground",
    icon: Bot,
    keywords: ["agent", "playground", "mastra", "chat"],
    authRequired: true,
    action: { type: "navigate", to: "/playground/agent" }
  }

  // Profile (D U) and Repositories (D O) are injected in use-command-items
  // once a username is known so paths resolve correctly.
]);
