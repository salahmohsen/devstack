import { type Effect } from "#@/effects";
import { resolvePath } from "#@/resolve-path";

export type ToolDef = { name: string; path: string; effect: Effect };

export function toToolName(path: string): string {
  return path
    .split(".")
    .map((segment) => segment.replace(/([A-Z])/g, "_$1").toLowerCase())
    .join("_");
}

const tool = (path: string, effect: Effect): ToolDef => {
  return {
    name: toToolName(path),
    path,
    effect
  };
};

const crud = (router: string, extra: ToolDef[] = []): ToolDef[] => [
  tool(`${router}.list`, "read"),
  tool(`${router}.get`, "read"),
  tool(`${router}.create`, "write"),
  tool(`${router}.update`, "write"),
  tool(`${router}.reorder`, "write"),
  tool(`${router}.delete`, "destructive"),
  ...extra
];

export const TOOLS: readonly ToolDef[] = [
  tool("jobDiscovery.findNow", "write"),
  tool("jobDiscovery.searchCities", "read"),

  tool("applications.list", "read"),
  tool("applications.listPage", "read"),
  tool("applications.listBoard", "read"),
  tool("applications.count", "read"),
  tool("applications.get", "read"),
  tool("applications.listActivity", "read"),
  tool("applications.previewListing", "read"),
  tool("applications.previewListingTake", "write"),
  tool("applications.scanJobAlerts", "write"),
  tool("applications.create", "write"),
  tool("applications.promote", "write"),
  tool("applications.dismiss", "write"),
  tool("applications.dismissFromHub", "write"),
  tool("applications.restore", "write"),
  tool("applications.batchDismiss", "write"),
  tool("applications.batchRestore", "write"),
  tool("applications.addNote", "write"),
  tool("applications.update", "write"),
  tool("applications.updateStage", "write"),
  tool("applications.setOutcome", "write"),
  tool("applications.regenerateAgentTake", "write"),
  tool("applications.refreshFromListingUrl", "write"),
  tool("applications.generateApplyPackage", "write"),
  tool("applications.deleteNote", "destructive"),
  tool("applications.delete", "destructive"),
  tool("applications.acceptApplyPackage", "outbound"),
  tool("applications.sendOutreach", "outbound"),

  tool("mail.list", "read"),
  tool("mail.get", "read"),
  tool("mail.assignApplication", "write"),
  tool("mail.unassignApplication", "write"),
  tool("mail.undoCrmApply", "write"),
  tool("mail.correctClassification", "write"),
  tool("mail.generateReply", "write"),
  tool("mail.sendReply", "outbound"),

  tool("notifications.list", "read"),
  tool("notifications.markRead", "write"),
  tool("notifications.markAllRead", "write"),

  tool("jobPreference.get", "read"),
  tool("jobPreference.upsert", "write"),
  tool("jobPreference.resetBoardScoresToday", "write"),
  tool("jobPreference.ensureBrief", "write"),

  tool("search.entities", "read"),

  ...crud("experiences", [tool("experiences.listPage", "read")]),
  ...crud("educations"),
  ...crud("certifications"),
  ...crud("projects", [
    tool("projects.listPage", "read"),
    tool("projects.toggleArchived", "write")
  ]),
  ...crud("stacks", [
    tool("stacks.listPage", "read"),
    tool("stacks.searchNpm", "read"),
    tool("stacks.listDependencies", "read"),
    tool("stacks.merge", "write"),
    tool("stacks.batchMerge", "write"),
    tool("stacks.batchUpdate", "write"),
    tool("stacks.addDependency", "write"),
    tool("stacks.upsertFromDetection", "write"),
    tool("stacks.removeDependency", "destructive")
  ]),

  tool("resume.list", "read"),
  tool("resume.get", "read"),
  tool("resume.setDefault", "write"),
  tool("resume.generate", "write"),
  tool("resume.delete", "destructive")
];

export function assertRegistryResolves(router: unknown): void {
  const missing = TOOLS.filter((def) => resolvePath(router, def.path) === undefined).map(
    (def) => def.path
  );
  if (missing.length > 0) {
    throw new Error(`MCP registry paths missing from router: ${missing.join(", ")}`);
  }
}
