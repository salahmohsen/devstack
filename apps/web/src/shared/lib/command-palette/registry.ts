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
  Keyboard,
  KeyRound,
  Layers,
  Blocks,
  ListChecks,
  Mail,
  Rocket,
  Settings,
  Sparkles,
  UserPlus,
  UserRound
} from "lucide-react";

import { setShortcutCheatsheetOpen } from "@/shared/lib/commands/cheatsheet-state";

import { setCommandPaletteOpen } from "./open-state";
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
 * Static palette destinations. Keyboard bindings live in `shared/lib/commands`
 * so they can be customized without changing the command itself.
 *
 * Protected routes set `authRequired` and are filtered out when signed out.
 * Dynamic Profile / Repositories items live in `use-command-items.ts`.
 */
registerCommands([
  {
    id: "shortcuts.cheatsheet",
    label: "Keyboard shortcuts",
    group: "Actions",
    icon: Keyboard,
    keywords: ["shortcuts", "cheatsheet", "hotkeys", "keyboard", "help"],
    action: {
      type: "execute",
      fn: () => {
        setCommandPaletteOpen(false);
        setShortcutCheatsheetOpen(true);
      }
    }
  },

  // —— Public ——
  {
    id: "nav:home",
    label: "Home",
    group: "Pages",
    icon: Home,
    keywords: ["home", "landing", "portfolio"],
    action: { type: "navigate", to: "/" }
  },

  // —— Dashboard (auth) ——
  {
    id: "nav:dashboard",
    label: "Agent",
    group: "Dashboard",
    icon: Bot,
    keywords: ["agent", "hub", "home", "dashboard"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/agent" }
  },
  {
    id: "nav:onboarding",
    label: "Onboarding",
    group: "Dashboard",
    icon: Rocket,
    keywords: ["onboarding", "setup", "getting started"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/onboarding" }
  },
  {
    id: "nav:experiences",
    label: "Experiences",
    group: "Dashboard",
    icon: Briefcase,
    keywords: ["experience", "work", "jobs", "career"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/experiences" }
  },
  {
    id: "nav:projects",
    label: "Projects",
    group: "Dashboard",
    icon: FolderKanban,
    keywords: ["projects", "portfolio", "work"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/projects" }
  },
  {
    id: "nav:stacks",
    label: "Skills",
    group: "Dashboard",
    icon: Layers,
    keywords: ["stack", "tech", "skills", "tools"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/skills" }
  },
  {
    id: "nav:resumes",
    label: "Resumes",
    group: "Dashboard",
    icon: FileText,
    keywords: ["resume", "cv", "document"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/resumes" }
  },
  {
    id: "nav:new-jobs",
    label: "New jobs",
    group: "Dashboard",
    icon: Sparkles,
    keywords: ["new jobs", "discoveries", "inbox", "harvest", "job alerts"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/new-jobs" }
  },
  {
    id: "nav:tracked-jobs",
    label: "Tracked jobs",
    group: "Dashboard",
    icon: ListChecks,
    keywords: ["tracked", "applications", "jobs", "pipeline", "crm", "seeker"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/tracked-jobs" }
  },
  {
    id: "nav:mail",
    label: "Mail",
    group: "Dashboard",
    icon: Mail,
    keywords: ["mail", "inbox", "email", "career"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/mail/applications" }
  },
  {
    id: "nav:settings",
    label: "Settings",
    group: "Dashboard",
    icon: Settings,
    keywords: ["settings", "preferences", "config"],
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
    keywords: ["account", "sessions", "security", "sign-in", "username", "rename"],
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
    id: "nav:settings-connections",
    label: "Settings: Integrations",
    group: "Settings",
    icon: Blocks,
    keywords: [
      "integrations",
      "connections",
      "google",
      "github",
      "oauth",
      "resend",
      "mail",
      "inbound"
    ],
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
    keywords: ["ai", "models", "providers"],
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
    id: "nav:admin-users",
    label: "Admin: Users",
    group: "Admin",
    icon: UserRound,
    keywords: ["admin", "users", "accounts", "ban"],
    authRequired: true,
    adminRequired: true,
    action: { type: "navigate", to: "/dashboard/admin/users" }
  },
  {
    id: "nav:admin-invites",
    label: "Admin: Invites",
    group: "Admin",
    icon: UserPlus,
    keywords: ["admin", "invites", "signup", "codes", "access"],
    authRequired: true,
    adminRequired: true,
    action: { type: "navigate", to: "/dashboard/admin/invites" }
  },
  {
    id: "nav:admin-access",
    label: "Admin: Access",
    group: "Admin",
    icon: KeyRound,
    keywords: ["admin", "registration", "open", "invite-only"],
    authRequired: true,
    adminRequired: true,
    action: { type: "navigate", to: "/dashboard/admin/access" }
  },
  {
    id: "nav:settings-shortcuts",
    label: "Settings: Shortcuts",
    group: "Settings",
    icon: Keyboard,
    keywords: ["shortcuts", "hotkeys", "keyboard", "bindings"],
    authRequired: true,
    action: { type: "navigate", to: "/dashboard/settings/shortcuts" }
  },

  // —— Playground (auth, DEV only) ——
  ...(import.meta.env.DEV
    ? ([
        {
          id: "nav:playground",
          label: "Playground",
          group: "Playground",
          icon: FlaskConical,
          keywords: ["playground", "dev", "experiments"],
          authRequired: true,
          action: { type: "navigate", to: "/playground" }
        },
        {
          id: "nav:playground-agent",
          label: "Agent Playground",
          group: "Playground",
          icon: Bot,
          keywords: ["agent", "playground", "mastra", "chat"],
          authRequired: true,
          action: { type: "navigate", to: "/playground/agent" }
        }
      ] satisfies CommandItem[])
    : [])

  // Profile (P R) and Repositories (R E P O) are injected in use-command-items
  // once a username is known so paths resolve correctly.
]);
