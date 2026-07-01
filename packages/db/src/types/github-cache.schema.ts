import {
  githubCacheNamespace,
  githubResponseCache,
  githubRevalidationSignal,
  githubWebhookEvent
} from "#@/schema/index";

const githubResponseCacheSchemaInsert = githubResponseCache.$inferInsert;
const githubResponseCacheSchemaSelect = githubResponseCache.$inferSelect;
export type GithubResponseCacheSchemaInsert = typeof githubResponseCacheSchemaInsert;
export type GithubResponseCacheSchemaSelect = typeof githubResponseCacheSchemaSelect;

const githubRevalidationSignalSchemaInsert = githubRevalidationSignal.$inferInsert;
const githubRevalidationSignalSchemaSelect = githubRevalidationSignal.$inferSelect;
export type GithubRevalidationSignalSchemaInsert = typeof githubRevalidationSignalSchemaInsert;
export type GithubRevalidationSignalSchemaSelect = typeof githubRevalidationSignalSchemaSelect;

const githubCacheNamespaceSchemaInsert = githubCacheNamespace.$inferInsert;
const githubCacheNamespaceSchemaSelect = githubCacheNamespace.$inferSelect;
export type GithubCacheNamespaceSchemaInsert = typeof githubCacheNamespaceSchemaInsert;
export type GithubCacheNamespaceSchemaSelect = typeof githubCacheNamespaceSchemaSelect;

const githubWebhookEventSchemaInsert = githubWebhookEvent.$inferInsert;
const githubWebhookEventSchemaSelect = githubWebhookEvent.$inferSelect;
export type GithubWebhookEventSchemaInsert = typeof githubWebhookEventSchemaInsert;
export type GithubWebhookEventSchemaSelect = typeof githubWebhookEventSchemaSelect;
