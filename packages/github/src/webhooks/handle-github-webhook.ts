import { createHmac, timingSafeEqual } from "node:crypto";

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

export async function handleGitHubWebhook(input: {
  deliveryId: string;
  event: string;
  payload: unknown;
  rawBody: string;
  runtime?: GitHubRuntimeBindings;
  signature256: string | null;
  webhookSecret: string;
}) {
  if (!verifyGitHubWebhookSignature(input.rawBody, input.signature256, input.webhookSecret)) {
    return {
      status: 401 as const
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
      status: 202 as const
    };
  }

  const signalKeys = getGitHubWebhookSignalKeys(input.event, input.payload);
  const namespaceKeys = getGitHubWebhookNamespaceKeys(input.event, input.payload);

  await markGitHubRevalidationSignals(signalKeys);
  await bumpGitHubCacheNamespaces(namespaceKeys);
  await githubCacheRepository.markWebhookDeliveryProcessed(input.deliveryId);

  if (input.runtime?.signalRelay) {
    const id = input.runtime.signalRelay.idFromName("global");
    const stub = input.runtime.signalRelay.get(id);
    const task = stub.fetch("https://internal/broadcast", {
      body: JSON.stringify({ signalKeys }),
      method: "POST"
    });
    input.runtime.executionContext?.waitUntil(task);
  }

  return {
    status: 202 as const
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
      githubRevalidationSignalKeys.ownerRepos(owner)
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
