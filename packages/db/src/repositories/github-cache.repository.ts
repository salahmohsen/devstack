import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "#@/index";
import {
  githubCacheNamespace,
  githubResponseCache,
  githubRevalidationSignal,
  githubWebhookEvent
} from "#@/schema/github-cache.schema";

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

class GitHubCacheRepository {
  async clearAll() {
    await getDb().delete(githubResponseCache);
    await getDb().delete(githubRevalidationSignal);
    await getDb().delete(githubCacheNamespace);
  }

  async findNamespaceVersion(namespace: string) {
    const [entry] = await getDb()
      .select()
      .from(githubCacheNamespace)
      .where(eq(githubCacheNamespace.namespace, namespace))
      .limit(1);

    return entry ?? null;
  }

  async findResponseCacheEntry(cacheKey: string) {
    const [entry] = await getDb()
      .select()
      .from(githubResponseCache)
      .where(eq(githubResponseCache.cacheKey, cacheKey))
      .limit(1);

    return entry ?? null;
  }

  async findRevalidationSignals(signalKeys: string[]) {
    if (signalKeys.length === 0) {
      return [];
    }

    return getDb()
      .select()
      .from(githubRevalidationSignal)
      .where(inArray(githubRevalidationSignal.signalKey, signalKeys))
      .orderBy(desc(githubRevalidationSignal.updatedAt));
  }

  async markWebhookDeliveryProcessed(deliveryId: string) {
    const [updatedEvent] = await getDb()
      .update(githubWebhookEvent)
      .set({
        processedAt: new Date()
      })
      .where(eq(githubWebhookEvent.deliveryId, deliveryId))
      .returning();

    return updatedEvent ?? null;
  }

  async markRevalidationSignals(signalKeys: string[]) {
    if (signalKeys.length === 0) {
      return [];
    }

    return Promise.all(
      signalKeys.map(async (signalKey) => {
        const [entry] = await getDb()
          .insert(githubRevalidationSignal)
          .values({ signalKey })
          .onConflictDoUpdate({
            set: {
              updatedAt: new Date()
            },
            target: githubRevalidationSignal.signalKey
          })
          .returning();

        return entry;
      })
    );
  }

  async bumpNamespaceVersion(namespace: string) {
    const existing = await this.findNamespaceVersion(namespace);

    if (!existing) {
      const [createdEntry] = await getDb()
        .insert(githubCacheNamespace)
        .values({
          namespace,
          version: 1
        })
        .returning();

      return createdEntry;
    }

    const [updatedEntry] = await getDb()
      .update(githubCacheNamespace)
      .set({
        updatedAt: new Date(),
        version: sql`${githubCacheNamespace.version} + 1`
      })
      .where(eq(githubCacheNamespace.namespace, namespace))
      .returning();

    return updatedEntry;
  }

  async recordWebhookDelivery(input: RecordGitHubWebhookDeliveryInput) {
    const [webhookEvent] = await getDb()
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
  }

  async upsertResponseCacheEntry(input: UpsertGitHubResponseCacheInput) {
    const [entry] = await getDb()
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
        },
        target: githubResponseCache.cacheKey
      })
      .returning();

    return entry;
  }

  async clearByOwner(owner: string) {
    await getDb().delete(githubResponseCache).where(eq(githubResponseCache.owner, owner));
  }

  async deleteResponseCacheEntry(cacheKey: string, owner: string) {
    await getDb()
      .delete(githubResponseCache)
      .where(and(eq(githubResponseCache.cacheKey, cacheKey), eq(githubResponseCache.owner, owner)));
  }
}

export const githubCacheRepository = new GitHubCacheRepository();
