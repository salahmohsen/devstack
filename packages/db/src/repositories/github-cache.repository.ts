import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { type NodePgTransaction } from "drizzle-orm/node-postgres";

import { getDb, type relations, type WsDb } from "../index.ts";
import {
  githubCacheNamespace,
  githubResponseCache,
  githubRevalidationSignal,
  githubWebhookEvent
} from "../schema/github-cache.schema.ts";

export type DbExecutor = WsDb | NodePgTransaction<typeof relations>;

export type UpsertGitHubResponseCacheInput = {
  cacheKey: string;
  namespace: string;
  namespaceVersion: number;
  owner: string;
  status: number;
  etag?: string | null;
  lastModified?: string | null;
  payload: unknown;
  staleAt?: Date | null;
  expiresAt?: Date | null;
};

export type RecordGitHubWebhookDeliveryInput = {
  action?: string | null;
  deliveryId: string;
  event: string;
  payload?: unknown;
  scope?: string | null;
};

export const githubCacheRepository = {
  async clearAll() {
    await getDb().delete(githubResponseCache);
    await getDb().delete(githubRevalidationSignal);
    await getDb().delete(githubCacheNamespace);
  },

  async findNamespaceVersion(namespace: string, executor: DbExecutor = getDb()) {
    const [entry] = await executor
      .select()
      .from(githubCacheNamespace)
      .where(eq(githubCacheNamespace.namespace, namespace))
      .limit(1);

    return entry ?? null;
  },

  async findResponseCacheEntry(cacheKey: string, executor: DbExecutor = getDb()) {
    const [entry] = await executor
      .select()
      .from(githubResponseCache)
      .where(eq(githubResponseCache.cacheKey, cacheKey))
      .limit(1);

    return entry ?? null;
  },

  async findRevalidationSignals(signalKeys: string[], executor: DbExecutor = getDb()) {
    if (signalKeys.length === 0) {
      return [];
    }

    return executor
      .select()
      .from(githubRevalidationSignal)
      .where(inArray(githubRevalidationSignal.signalKey, signalKeys))
      .orderBy(desc(githubRevalidationSignal.updatedAt));
  },

  async findLatestRevalidationSignalAt(
    signalKeys: string[],
    executor: DbExecutor = getDb()
  ): Promise<Date | null> {
    if (signalKeys.length === 0) {
      return null;
    }

    const [entry] = await executor
      .select({ updatedAt: githubRevalidationSignal.updatedAt })
      .from(githubRevalidationSignal)
      .where(inArray(githubRevalidationSignal.signalKey, signalKeys))
      .orderBy(desc(githubRevalidationSignal.updatedAt))
      .limit(1);

    return entry?.updatedAt ?? null;
  },

  async markWebhookDeliveryProcessed(deliveryId: string, executor: DbExecutor = getDb()) {
    const [updatedEvent] = await executor
      .update(githubWebhookEvent)
      .set({
        processedAt: sql`now()`
      })
      .where(eq(githubWebhookEvent.deliveryId, deliveryId))
      .returning();

    return updatedEvent ?? null;
  },

  async markRevalidationSignals(signalKeys: string[], executor: DbExecutor = getDb()) {
    if (signalKeys.length === 0) {
      return [];
    }

    return executor
      .insert(githubRevalidationSignal)
      .values(
        signalKeys.map((signalKey) => {
          return { signalKey };
        })
      )
      .onConflictDoUpdate({
        target: githubRevalidationSignal.signalKey,
        set: {
          updatedAt: sql`now()`
        }
      })
      .returning();
  },

  async bumpNamespaceVersion(namespaces: string | string[], executor: DbExecutor = getDb()) {
    const keys = Array.isArray(namespaces) ? namespaces : [namespaces];
    if (keys.length === 0) {
      return [];
    }

    return executor
      .insert(githubCacheNamespace)
      .values(
        keys.map((namespace) => {
          return { namespace, version: 1 };
        })
      )
      .onConflictDoUpdate({
        target: githubCacheNamespace.namespace,
        set: {
          version: sql`${githubCacheNamespace.version} + 1`,
          updatedAt: sql`now()`
        }
      })
      .returning();
  },

  async recordWebhookDelivery(
    input: RecordGitHubWebhookDeliveryInput,
    executor: DbExecutor = getDb()
  ) {
    const [webhookEvent] = await executor
      .insert(githubWebhookEvent)
      .values({
        action: input.action ?? null,
        deliveryId: input.deliveryId,
        event: input.event,
        payload: input.payload ?? null,
        scope: input.scope ?? null
      })
      .onConflictDoNothing()
      .returning();

    return webhookEvent ?? null;
  },

  async upsertResponseCacheEntry(
    input: UpsertGitHubResponseCacheInput,
    executor: DbExecutor = getDb()
  ) {
    const [entry] = await executor
      .insert(githubResponseCache)
      .values({
        cacheKey: input.cacheKey,
        etag: input.etag ?? null,
        expiresAt: input.expiresAt ?? null,
        fetchedAt: new Date(),
        lastModified: input.lastModified ?? null,
        namespace: input.namespace,
        namespaceVersion: input.namespaceVersion,
        owner: input.owner,
        payload: input.payload,
        staleAt: input.staleAt ?? null,
        status: input.status
      })
      .onConflictDoUpdate({
        target: githubResponseCache.cacheKey,
        set: {
          etag: input.etag ?? null,
          expiresAt: input.expiresAt ?? null,
          fetchedAt: new Date(),
          lastModified: input.lastModified ?? null,
          namespace: input.namespace,
          namespaceVersion: input.namespaceVersion,
          owner: input.owner,
          payload: input.payload,
          staleAt: input.staleAt ?? null,
          status: input.status,
          updatedAt: new Date()
        }
      })
      .returning();

    return entry;
  },

  async clearByOwner(owner: string, executor: DbExecutor = getDb()) {
    await executor.delete(githubResponseCache).where(eq(githubResponseCache.owner, owner));
  },

  async deleteResponseCacheEntry(cacheKey: string, owner: string, executor: DbExecutor = getDb()) {
    await executor
      .delete(githubResponseCache)
      .where(and(eq(githubResponseCache.cacheKey, cacheKey), eq(githubResponseCache.owner, owner)));
  }
};
