import { createHmac, timingSafeEqual } from "node:crypto";

import { getDb } from "@tsu-stack/db";
import { githubCacheRepository } from "@tsu-stack/db/repositories";

import {
  bumpGitHubCacheNamespaces,
  markGitHubRevalidationSignals
} from "#@/infrastructure/cache/github-cache";
import { githubRevalidationSignalKeys } from "#@/infrastructure/cache/github-revalidation";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";

const SUPPORTED_GITHUB_WEBHOOK_EVENTS = new Set([
  "discussion",
  "fork",
  "issues",
  "public",
  "pull_request",
  "push",
  "repository",
  "star",
  "watch"
]);

const IDENTITY_REFRESH_TRIGGER_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  ".github/copilot-instructions.md"
]);

export type HandleGitHubWebhookResult =
  | { status: 401 }
  | { headSha: string | null; shouldRefreshIdentity: boolean; status: 200 }
  | { status: 202 };

export async function handleGitHubWebhook(input: {
  deliveryId: string;
  event: string;
  payload: unknown;
  rawBody: string;
  runtime?: GitHubRuntimeBindings;
  signature256: string | null;
  webhookSecret: string;
}): Promise<HandleGitHubWebhookResult> {
  if (!verifyGitHubWebhookSignature(input.rawBody, input.signature256, input.webhookSecret)) {
    return {
      status: 401
    };
  }

  await githubCacheRepository.recordWebhookDelivery({
    deliveryId: input.deliveryId,
    event: input.event,
    payload: input.payload
  });

  if (!SUPPORTED_GITHUB_WEBHOOK_EVENTS.has(input.event)) {
    await githubCacheRepository.markWebhookDeliveryProcessed(input.deliveryId);
    return {
      status: 202
    };
  }

  const signalKeys = getGitHubWebhookSignalKeys(input.event, input.payload);
  const namespaceKeys = getGitHubWebhookNamespaceKeys(input.event, input.payload);

  await getDb().transaction(async (tx) => {
    await markGitHubRevalidationSignals(signalKeys, tx);
    await bumpGitHubCacheNamespaces(namespaceKeys, tx);
    await githubCacheRepository.markWebhookDeliveryProcessed(input.deliveryId, tx);
  });

  if (input.runtime?.broadcast) {
    input.runtime.broadcast(signalKeys);
  }

  return {
    headSha: getPushHeadSha(input.event, input.payload),
    shouldRefreshIdentity: hasIdentityRefreshTriggerFile(input.event, input.payload),
    status: 200
  };
}

function getGitHubWebhookNamespaceKeys(event: string, payload: unknown) {
  const repo = getRepositoryIdentity(payload);
  const owner = getPayloadOwner(payload);
  const keys: string[] = [];

  if (owner && ["push", "star", "watch", "fork", "public"].includes(event)) {
    keys.push(
      githubRevalidationSignalKeys.ownerActivity(owner),
      githubRevalidationSignalKeys.ownerContributions(owner),
      githubRevalidationSignalKeys.ownerPinnedRepos(owner),
      githubRevalidationSignalKeys.ownerProfile(owner),
      githubRevalidationSignalKeys.PublicOwnerRepos(owner),
      githubRevalidationSignalKeys.PrivateOwnerRepos(owner)
    );
  }

  if (repo) {
    keys.push(
      githubRevalidationSignalKeys.repoCode(repo),
      githubRevalidationSignalKeys.repoMeta(repo)
    );
  }

  return [...new Set(keys)];
}

function getGitHubWebhookSignalKeys(event: string, payload: unknown) {
  return getGitHubWebhookNamespaceKeys(event, payload);
}

function getPayloadOwner(payload: unknown) {
  const repo = getRepositoryIdentity(payload);
  if (repo) {
    return repo.owner;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "sender" in payload &&
    payload.sender &&
    typeof payload.sender === "object" &&
    "login" in payload.sender &&
    typeof payload.sender.login === "string"
  ) {
    return payload.sender.login;
  }

  return null;
}

function getRepositoryIdentity(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("repository" in payload)) {
    return null;
  }

  const repository = payload.repository;
  if (!repository || typeof repository !== "object") {
    return null;
  }

  const owner =
    "owner" in repository &&
    repository.owner &&
    typeof repository.owner === "object" &&
    "login" in repository.owner &&
    typeof repository.owner.login === "string"
      ? repository.owner.login
      : null;
  const repo = "name" in repository && typeof repository.name === "string" ? repository.name : null;

  return owner && repo ? { owner, repo } : null;
}

function verifyGitHubWebhookSignature(
  rawBody: string,
  signature256: string | null,
  webhookSecret: string
) {
  if (!signature256) {
    return false;
  }

  const digest = `sha256=${createHmac("sha256", webhookSecret).update(rawBody).digest("hex")}`;
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature256);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getPushHeadSha(event: string, payload: unknown): string | null {
  if (event !== "push" || !payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (
    "head_commit" in p &&
    p.head_commit &&
    typeof p.head_commit === "object" &&
    "id" in p.head_commit &&
    typeof p.head_commit.id === "string"
  ) {
    return p.head_commit.id;
  }
  if ("after" in p && typeof p.after === "string") {
    return p.after;
  }
  return null;
}

function hasIdentityRefreshTriggerFile(event: string, payload: unknown): boolean {
  if (event !== "push") return false;
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (!("head_commit" in p) || !p.head_commit || typeof p.head_commit !== "object") {
    return false;
  }
  const headCommit = p.head_commit as Record<string, unknown>;
  for (const key of ["modified", "added", "removed"] as const) {
    const list = headCommit[key];
    if (!Array.isArray(list)) continue;
    for (const path of list) {
      if (typeof path !== "string") continue;
      if (IDENTITY_REFRESH_TRIGGER_FILES.has(path)) return true;
      if (isReadmePath(path)) return true;
    }
  }
  return false;
}

function isReadmePath(path: string): boolean {
  const basename = path.split("/").pop() ?? path;
  return basename.toLowerCase() === "readme.md";
}
