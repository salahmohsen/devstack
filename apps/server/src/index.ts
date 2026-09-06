import { type Server as HTTPServer } from "node:http";

import { serve } from "@hono/node-server";

import {
  registerJobDiscoveryLandEnqueue,
  registerJobInboxAiEnqueue
} from "@tsu-stack/api/lib/job-discovery/enqueue";
import { registerMailClassifyEnqueue } from "@tsu-stack/api/lib/mail/classify-enqueue-hook";
import { registerMailJobHarvestEnqueue } from "@tsu-stack/api/lib/mail/harvest-enqueue-hook";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { app } from "#@/app";
import { createGithubGateway, broadcastSignals } from "#@/github-gateway";
import { startJobDiscoveryFetchQueue } from "#@/queues/job-discovery-fetch-queue";
import {
  enqueueJobDiscoveryLand,
  startJobDiscoveryLandQueue
} from "#@/queues/job-discovery-land-queue";
import { enqueueJobInboxAi, startJobInboxAiQueue } from "#@/queues/job-inbox-ai-queue";
import { startJobInboxTickQueue } from "#@/queues/job-inbox-tick-queue";
import { enqueueMailClassify, startMailClassifyQueue } from "#@/queues/mail-classify-queue";
import { enqueueMailJobHarvest, startMailJobHarvestQueue } from "#@/queues/mail-job-harvest-queue";
import { initRuntime, setBroadcastSignals } from "#@/runtime-context";
import "#@/shared/lib/logger";

initRuntime();

async function start(): Promise<void> {
  // Apply DB migrations before accepting traffic when opted in (Docker sets
  // RUN_MIGRATIONS=true). Leave unset in local dev — use `pnpm db:migrate`.
  if (process.env.RUN_MIGRATIONS === "true" || process.env.RUN_MIGRATIONS === "1") {
    // One emit per logger lifetime (post-emit set is invalid).
    const folder = process.env.MIGRATIONS_FOLDER ?? "(default packages/db/migrations)";
    const startLog = createLogger({ operation: "server__database_migration" });
    startLog.set({ event: "database_migration_starting", migrationsFolder: folder });
    startLog.emit();
    try {
      const { migrateDatabase } = await import("@tsu-stack/db/migrate");
      await migrateDatabase();
      const doneLog = createLogger({ operation: "server__database_migration" });
      doneLog.set({ event: "database_migration_completed", migrationsFolder: folder });
      doneLog.emit();
    } catch (error) {
      const failLog = createLogger({ operation: "server__database_migration" });
      failLog.error(error instanceof Error ? error : new Error(String(error)), {
        event: "database_migration_failed",
        migrationsFolder: folder
      });
      failLog.emit({ _forceKeep: true });
      throw error;
    }
  }

  // Bind all interfaces so container healthchecks on 127.0.0.1 succeed.
  const port = Number(ENV_SERVER.PORT ?? 5100);
  const httpServer = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    const bootLog = createLogger({ operation: "server__http_listen" });
    bootLog.set({
      event: "server_started",
      port: info.port,
      hasRedis: Boolean(ENV_SERVER.REDIS_URL)
    });
    bootLog.emit();
  }) as unknown as HTTPServer;

  if (ENV_SERVER.REDIS_URL) {
    try {
      createGithubGateway(httpServer, ENV_SERVER.REDIS_URL);
      setBroadcastSignals(broadcastSignals);
    } catch (error) {
      const log = createLogger({ operation: "server__github_gateway" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "github_gateway_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Career Inbox classify queue (BullMQ). Soft-fail so Redis/BullMQ issues
    // never keep /health/live from answering.
    // Static imports: already pulled in by app.ts / gmail sync — dynamic import
    // would be ineffective (same chunk) and only adds bundler noise.
    try {
      startMailClassifyQueue(ENV_SERVER.REDIS_URL);
      registerMailClassifyEnqueue(async ({ messageId, userId }) => {
        const result = await enqueueMailClassify({ messageId, userId });
        return result.enqueued;
      });
    } catch (error) {
      const log = createLogger({ operation: "server__mail_classify_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "mail_classify_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Job harvest after job_notifier classify (extract → score → Applications).
    try {
      startMailJobHarvestQueue(ENV_SERVER.REDIS_URL);
      registerMailJobHarvestEnqueue(async ({ messageId, userId, force }) => {
        const result = await enqueueMailJobHarvest({ messageId, userId }, { force });
        return result.enqueued;
      });
    } catch (error) {
      const log = createLogger({ operation: "server__mail_job_harvest_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "mail_job_harvest_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Periodic Gmail History sync for users with Gmail scopes + auto-sync on.
    try {
      const { startGmailSyncQueue } = await import("#@/queues/gmail-sync-queue");
      startGmailSyncQueue(ENV_SERVER.REDIS_URL);
    } catch (error) {
      const log = createLogger({ operation: "server__gmail_sync_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "gmail_sync_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Hourly email digests for users on digest delivery mode.
    try {
      const { startNotificationDigestQueue } = await import("#@/queues/notification-digest-queue");
      startNotificationDigestQueue(ENV_SERVER.REDIS_URL);
    } catch (error) {
      const log = createLogger({ operation: "server__notification_digest_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "notification_digest_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Daily hard-delete of dismissed discoveries past retention (URL free to re-harvest).
    try {
      const { startDismissedApplicationPurgeQueue } =
        await import("#@/queues/dismissed-application-purge-queue");
      startDismissedApplicationPurgeQueue(ENV_SERVER.REDIS_URL);
    } catch (error) {
      const log = createLogger({ operation: "server__dismissed_application_purge_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "dismissed_application_purge_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Discovery land first so the fetch tick can enqueue delayed land jobs.
    try {
      startJobDiscoveryLandQueue(ENV_SERVER.REDIS_URL);
      registerJobDiscoveryLandEnqueue(async (payload, opts) => {
        const result = await enqueueJobDiscoveryLand(payload, opts);
        return result.enqueued;
      });
    } catch (error) {
      const log = createLogger({ operation: "server__job_discovery_land_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "job_discovery_land_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    try {
      startJobInboxAiQueue(ENV_SERVER.REDIS_URL);
      registerJobInboxAiEnqueue(async (payload) => {
        const result = await enqueueJobInboxAi(payload);
        return result.enqueued;
      });
    } catch (error) {
      const log = createLogger({ operation: "server__job_inbox_ai_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "job_inbox_ai_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // 24h fetch tick: fans out one staggered land job per enrolled user.
    try {
      startJobDiscoveryFetchQueue(ENV_SERVER.REDIS_URL);
    } catch (error) {
      const log = createLogger({ operation: "server__job_discovery_fetch_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "job_discovery_fetch_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }

    // Inbox tick: TTL dismissal + silence nudges + user_job purge (12h).
    try {
      startJobInboxTickQueue(ENV_SERVER.REDIS_URL);
    } catch (error) {
      const log = createLogger({ operation: "server__job_inbox_tick_queue" });
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "job_inbox_tick_queue_start_failed"
      });
      log.emit({ _forceKeep: true });
    }
  }
}

start().catch((err) => {
  const failLog = createLogger({ operation: "server__start_failed" });
  failLog.error(err instanceof Error ? err : new Error(String(err)), {
    event: "server_start_failed"
  });
  failLog.emit({ _forceKeep: true });
  process.exit(1);
});
