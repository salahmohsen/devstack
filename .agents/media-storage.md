# Media Storage And Uploads

Use this when introducing or changing S3-compatible object storage, upload contracts, object-delete behavior, browser uploads via the files gateway, or (when introduced) the database record that tracks uploaded files.

This repo **ships object storage** via `files-sdk` + the `files-sdk/s3` adapter (MinIO locally, any S3-compatible endpoint in production). There is **no `media_asset` table yet** — keys and lifecycle live on owning domain rows (or session draft state) rather than a generic asset ledger.

This file is the source of truth for storage architecture and conventions. When a new storage feature lands, update this file in the same change.

This guide should stay aligned with:

- [Core package patterns](./core.md)
- [Environment variables](./environment-variables.md)
- [oRPC patterns](./orpc.md)
- [Workflow](./workflow.md)

## Current Stack

| Piece             | Location / value                                                              |
| ----------------- | ----------------------------------------------------------------------------- |
| Library           | `files-sdk` + `files-sdk/s3`                                                  |
| Configured client | `packages/api/src/lib/storage/index.ts` → `createFiles()`                     |
| oRPC context      | `context.mediaBucket` is the same `Files` instance (`put` / `get` / `delete`) |
| Browser gateway   | `apps/web/src/server/files-gateway.ts` mounted at `/api/files`                |
| Gateway route     | `apps/web/src/routes/api/files/index.ts`                                      |
| Progress UI       | `apps/web/src/components/files-sdk/upload-progress.tsx`                       |
| Env validation    | `packages/env/src/web/env.server.ts` (`ENV_WEB_SERVER`)                       |

```ts
// packages/api/src/lib/storage/index.ts
import { Files } from "files-sdk";
import { s3 } from "files-sdk/s3";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export function createFiles() {
  return new Files({
    adapter: s3({
      bucket: ENV_WEB_SERVER.S3_BUCKET ?? "personal-hub",
      region: ENV_WEB_SERVER.S3_REGION ?? "us-east-1",
      endpoint: ENV_WEB_SERVER.S3_ENDPOINT,
      forcePathStyle: ENV_WEB_SERVER.S3_FORCE_PATH_STYLE ?? true,
      credentials: {
        accessKeyId: ENV_WEB_SERVER.S3_ACCESS_KEY ?? "",
        secretAccessKey: ENV_WEB_SERVER.S3_SECRET_KEY ?? ""
      },
      publicBaseUrl: ENV_WEB_SERVER.MEDIA_PUBLIC_URL
    })
  });
}
```

Prefer adapter-provided URL resolution such as `await files.url(key)` over hand-rolled public URL helpers.

## Environment Variables

Storage env is validated on **`ENV_WEB_SERVER`** in `packages/env` (not a separate MinIO\_\* naming scheme):

| Variable              | Role                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `S3_ENDPOINT`         | S3-compatible endpoint (local MinIO: `http://127.0.0.1:9002` — host map, not container 9000)                                   |
| `S3_ACCESS_KEY`       | Access key (local default `minioadmin`, must match MinIO `MINIO_ROOT_USER`)                                                    |
| `S3_SECRET_KEY`       | Secret key (local default `minioadmin`, must match MinIO `MINIO_ROOT_PASSWORD`)                                                |
| `S3_BUCKET`           | Bucket name (default `personal-hub`)                                                                                           |
| `S3_REGION`           | Region (default `us-east-1`)                                                                                                   |
| `S3_FORCE_PATH_STYLE` | Path-style URLs; required for MinIO (default `true`)                                                                           |
| `MEDIA_PUBLIC_URL`    | Public base for `files.url(key)` (local MinIO: `http://127.0.0.1:9002/personal-hub`, or app proxy: `{VITE_WEB_URL}/api/media`) |
| `FILES_API_SECRET`    | HMAC secret for the files-sdk gateway                                                                                          |

### Public avatars vs private objects

- **Profile avatars** (`{userId}/avatars/*`) are **public portfolio media**. MinIO gets a scoped anonymous `GetObject` policy for that prefix only (`minio-init` / `scripts/dev.sh`).
- **App proxy:** `GET /api/media/{userId}/avatars/{file}` streams the same keys with server credentials when `MEDIA_PUBLIC_URL` points at the web app (docker default `${VITE_WEB_URL}/api/media`). Non-avatar keys return 404.
- **Resume sources, generated resumes, cover letters** stay private (no anonymous access; download via auth-gated routes).

See `packages/env/.env.example` for local placeholders. For propagation checklists, follow [Environment variables](./environment-variables.md).

## Browser Gateway (`/api/files`)

Direct browser-to-storage uploads go through the files-sdk API gateway, not oRPC.

```ts
// apps/web/src/server/files-gateway.ts (shape)
export const filesRouter = createFilesRouter({
  files: createFiles(),
  secret: ENV_WEB_SERVER.FILES_API_SECRET,
  allowedOrigins: [ENV_WEB_ISOMORPHIC.VITE_WEB_URL],
  authorize: async ({ req }) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      throw new FilesError("Unauthorized", "sign in");
    }
    return { keyPrefix: `${session.user.id}/` };
  }
});
```

Important gateway rules:

- **Auth required.** Unauthenticated requests are rejected.
- **`keyPrefix` is `${userId}/`.** The gateway prepends this server-side. Client-relative keys do **not** include the user id.
- **Not a global PDF-only gate.** The gateway does not enforce resume MIME/size limits for all uploads. Feature-specific allowlists live in the owning UI + server procedure (see below).
- Client hooks use `useFiles({ endpoint: "/api/files" })` from `files-sdk/react`.

Example client upload (relative key → full object key under the user prefix):

```ts
const files = useFiles({ endpoint: "/api/files" });
// Client: "resume-sources/{uuid}.pdf"
// Full S3 key: "{userId}/resume-sources/{uuid}.pdf"
await files.upload(key, file, { contentType: "application/pdf" });
```

## Object Key Conventions

| Purpose                                       | Who writes               | Client / relative key       | Full object key                                     |
| --------------------------------------------- | ------------------------ | --------------------------- | --------------------------------------------------- |
| Session resume source (onboarding PDF import) | Browser via `/api/files` | `resume-sources/{uuid}.pdf` | `{userId}/resume-sources/{uuid}.pdf`                |
| Generated resume PDF                          | Server `mediaBucket.put` | n/a (server-only)           | `resumes/{filename}` or `{userId}/resumes/…`        |
| Apply package cover letter PDF                | Server `mediaBucket.put` | n/a (server-only)           | `{userId}/cover-letters/{applicationId}-{uuid}.pdf` |
| Ad hoc image field                            | Browser via `/api/files` | filename or relative path   | `{userId}/…`                                        |
| Profile avatar                                | Browser via `/api/files` | `avatars/{uuid}.{ext}`      | `{userId}/avatars/{uuid}.{ext}` (public read)       |

### Resume sources (`resume-sources/…`)

- Shared constants: `RESUME_SOURCE_KEY_PREFIX`, `RESUME_SOURCE_MAX_BYTES` (10MB), `RESUME_SOURCE_MIME` (`application/pdf`) in `packages/core/src/onboarding/constants.ts`.
- Key normalization: `resolveResumeSourceObjectKey` / `requireResumeSourceObjectKey` accept relative `resume-sources/…` or full `{userId}/resume-sources/…`; reject path traversal, other users, and the generated `resumes/` tree.
- **MIME and size are enforced at the onboarding upload UI and extract procedure**, not as a global gateway policy.
  - UI: `apps/web/src/pages/dashboard/onboarding/ui/upload-step.tsx`
  - Extract: `packages/api/src/routers/onboarding.router.ts` (byte length + `looksLikePdf`)
- Upload remains files-sdk at `/api/files`. Extract receives the storage **key** only; the server downloads bytes via `mediaBucket.get`.

### Generated resumes (`resumes/…`)

- Written server-side with `context.mediaBucket.put` in `packages/api/src/routers/resume.router.ts`.
- Prefer keys under the tenant prefix (`{userId}/resumes/…`); legacy keys may still be `resumes/{filename}` or `resumes/{uuid}-{filename}`.
- Linked from the resume domain row (`r2Key` column name is historical; storage is S3/MinIO). Each resume row is scoped by `userId`.
- Delete removes the DB row and the object (synchronized hard delete).
- **Onboarding promote:** after a successful `onboarding.apply` with a session source key, the API copies the PDF into a durable resume key, creates a resume row for **that session user** with `author: "admin"` (historical enum value for human/user-authored — not a site-admin role), sets it as default for that user, then deletes the temporary `resume-sources/` object (`packages/api/src/lib/onboarding/promote-resume-source.ts`). Skip/discard still only delete the session source.
- **Apply package accept** also writes a tailored resume under the tenant resume tree (`packages/api/src/lib/application/accept-apply-package.ts`, `author: "agent"`).

### Cover letters (`{userId}/cover-letters/…`)

- Server-only PDFs from **apply package accept** (`packages/api/src/lib/application/accept-apply-package.ts`).
- Full key: `{userId}/cover-letters/{applicationId}-{uuid}.pdf`.
- Linked from the application row (`coverLetterR2Key`, `coverLetterFilename`, `coverLetterBody`). Served via `/api/cover-letter/download/`.
- Re-accept best-effort deletes the prior cover object before writing a new one (synchronized hard delete of the old key).

## What Is Not Built Yet

- **No `media_asset` table** or generic asset ledger. Do not invent one unless the feature needs multi-purpose lifecycle tracking.
- No shared `packages/core/src/media-asset/` package yet.
- No generic create/complete/link upload contract procedures.

When a feature needs a first-class asset row, follow [Future: generic media asset](#future-generic-media-asset) and update this file.

## Goals (Still Apply)

- Prefer storing only the storage **key** (and owning-domain metadata). Derive delivery URLs from config + `key` at read time.
- Keep business metadata on the owning row (or client draft), not on a generic asset table unless one exists.
- Default to direct browser-to-storage uploads via `/api/files`, with the API brokering signed contracts through files-sdk.
- Server-side puts via `mediaBucket` when the app generates the bytes (e.g. resume PDF).
- Default to synchronized hard delete unless a feature needs async/retry/retention.
- Soft-delete remains available for future exceptions; do not build around it by default.

## Package Shape (Today)

```text
packages/api/src/lib/storage/
  index.ts                 # createFiles() — S3 adapter only

packages/core/src/onboarding/
  constants.ts             # resume-source prefix, MIME, max bytes
  utils.ts                 # resolveResumeSourceObjectKey

packages/api/src/lib/onboarding/
  object-key.ts            # requireResumeSourceObjectKey
  pdf-text.ts              # download + PDF text extract helpers

apps/web/src/server/
  files-gateway.ts         # createFilesRouter + session keyPrefix

apps/web/src/routes/api/files/
  index.ts                 # GET/POST/PUT → filesRouter.handle

apps/web/src/components/files-sdk/
  upload-progress.tsx      # shared progress UI
```

oRPC procedures stay in the owning slice router per [oRPC patterns](./orpc.md). Do not create routers under `lib/storage`.

## Upload Flow (Browser)

1. Authenticated client calls `useFiles({ endpoint: "/api/files" })`.
2. Upload with a **relative** key under the feature prefix (gateway adds `{userId}/`).
3. Validate MIME/size in the **owning feature** before upload when product rules require it.
4. Persist or pass the returned key to the owning procedure (e.g. onboarding extract).
5. Server normalizes key ownership, then `mediaBucket.get` / `delete` as needed.

Do not proxy file bytes through the application server for browser uploads unless explicitly required.

## Delete Lifecycle

Default to synchronized hard delete unless the task explicitly asks for queueing, retention, or retry.

### Synchronized Hard Delete

- Flow: delete the storage object in the request path, then remove owning row state (or best-effort discard for session drafts).
- Used today for generated resumes and onboarding source discard.
- Recommendation: start here unless resilience needs justify workers.

### Async Delete With Retry

Use when request-path storage deletes become an operational liability. Requires queue/worker and reconciliation — do not introduce by default.

### Soft Delete Or Retention Window

Use only when product/compliance requires undo or delayed purge.

If a delete can fail, surface a typed application error instead of silently leaving partial state (session resume sources may best-effort delete and tolerate short-term orphans).

```ts
await context.mediaBucket.delete(fullKey);
```

## Permission And Policy Checklist

When changing S3 policy or adding a new upload purpose:

- Create the bucket or prefix intentionally.
- Decide public/CDN vs private signed-download per purpose.
- Minimum permissions: usually `PutObject`, `GetObject`, `DeleteObject`, `HeadObject`; `ListBucket` only when needed.
- Scope permissions by bucket/prefix when the provider allows it.
- Configure CORS for browser uploads (origins, `PUT`/`POST`, `GET`, `HEAD`, signed headers, `Content-Type`).
- Prefer `files.url(key)` / adapter resolvers; do not persist durable public URLs on domain rows.
- Enforce content types and max size in **application validation** for that feature — the gateway is not a global MIME allowlist.
- Decide delete behavior before shipping.
- Update this file when conventions change.

## Change Rules

- New upload classes should document their key prefix, who writes (browser vs server), MIME/size enforcement location, and delete path in this file.
- Prefer keys under the gateway user prefix for user-owned browser uploads; document any server-only roots (like `resumes/`) explicitly.
- Keep shared limits/constants next to the owning domain in `packages/core` (as with onboarding resume sources).
- Keep delivery URLs derived from config and `key`.
- Prefer generic helpers only when a second feature reuses them; slice-local is fine for the first consumer.
- If the user asks for async delete, soft delete, delayed deletion, or object retention, confirm asset classes and operational reasons first.
- Introducing a generic `media_asset` table is a deliberate cross-cutting change — follow the section below and land docs in the same PR.

## Future: Generic Media Asset

Use this only when a feature needs multi-purpose lifecycle tracking (pending upload → linked → delete) shared across slices.

Suggested layout if/when introduced:

```text
packages/core/src/media-asset/
  constants.ts
  types.ts
  utils.ts
  index.ts

packages/db/src/schema/
  media-asset.schema.ts

packages/api/src/lib/storage/
  index.ts                 # existing createFiles()
  media-asset/index.ts     # create/complete/delete helpers
```

Suggested responsibilities:

- Core: MIME lists, size limits, purpose enums, upload request/result schemas
- DB: generic object-storage record (owner, purpose, key, content type, size, status, timestamps) — **no persisted public URL**
- API helpers: contract issuance, complete/link, delete object + row
- oRPC: owning slice routers only
- Web: feature-slice mutations; extract shared browser helpers only when reused

Default statuses if introduced: `pending_upload` → `uploaded_orphaned` → `linked`. Optional async statuses (`delete_pending`, etc.) only with explicit design.

Default direct-upload contract pattern (when `media_asset` exists):

1. Validate content type, size, purpose, file name.
2. Create the row with status `pending_upload` and a UUID-based key.
3. Return a signed upload contract from files-sdk.
4. Browser uploads to storage.
5. Complete after object existence is confirmed; link from the owning business row.

Until that table exists, continue storing keys on domain rows / draft state as the resume and resume-source flows do today.
