# R2 + files-sdk Upload Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken UploadThing integration with a Cloudflare R2 + `files-sdk` direct-upload flow, eliminating the regional routing hang caused by the free-plan `sea1` token pin.

**Architecture:** Presigned URL pattern. The browser asks the worker for a signed PUT contract, uploads directly to R2, and uses the returned public URL as the form value. The worker never sees upload bytes. R2 is accessed via the S3-compatible API using `files-sdk/r2` in HTTP mode (no Workers binding required for this use case).

**Tech Stack:** Cloudflare R2, `files-sdk` (R2 adapter), TanStack Start API routes, native `<input type="file">` in React, existing Better Auth for the upload-contract route.

---

## File Structure

| Action | Path                                                    | Responsibility                                              |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| Modify | `pnpm-workspace.yaml`                                   | Drop `uploadthing` + `@uploadthing/react`; add `files-sdk`  |
| Modify | `packages/env/src/web/env.server.ts`                    | Replace `UPLOADTHING_TOKEN` with `R2_*` env vars            |
| Create | `packages/api/src/lib/storage/index.ts`                 | Configured `Files` client using `r2()` adapter              |
| Create | `apps/web/src/server/files-gateway.ts`                  | Hono sub-app mounting the `files-sdk` gateway with auth     |
| Create | `apps/web/src/routes/api/files/index.ts`                | TanStack Start bridge route that delegates to the Hono app  |
| Create | `apps/web/src/components/files-sdk/upload-progress.tsx` | shadcn `UploadProgress` component                           |
| Modify | `apps/web/src/shared/form/image-field.tsx`              | Replace `UploadButton` with `useFiles` + `<UploadProgress>` |
| Delete | `apps/web/src/server/uploadthing.ts`                    | Old upload router                                           |
| Delete | `apps/web/src/routes/api/uploadthing/`                  | Old route handler                                           |
| Delete | `apps/web/src/shared/lib/uploadthing/`                  | Old client wrapper                                          |
| Create | `apps/web/.dev.vars` (user action)                      | R2 env values for local dev                                 |

---

## Task 1: Create R2 bucket and generate API token (manual, user action)

**No code changes — this is a Cloudflare dashboard task.**

- [ ] **Step 1: Create the bucket**
  - Go to Cloudflare dashboard → R2 → Create bucket
  - Name: `personal-hub-media`
  - Location: `us-east-1` (or your nearest region)
  - Enable public access via the R2.dev subdomain (Settings → Public access → Allow Access → copy the `*.r2.dev` URL)

- [ ] **Step 2: Generate an API token**
  - R2 → Manage R2 API Tokens → Create API token
  - Permissions: **Object Read & Write**
  - Scope: scope to `personal-hub-media` bucket
  - Copy the **Access Key ID** and **Secret Access Key** (the secret is shown only once)

- [ ] **Step 3: Find your account ID**
  - Cloudflare dashboard → R2 → right sidebar → Account ID

- [ ] **Step 4: Record the values**
  - `R2_ACCOUNT_ID` = account ID
  - `R2_ACCESS_KEY_ID` = access key
  - `R2_SECRET_ACCESS_KEY` = secret key
  - `R2_BUCKET` = `personal-hub-media`
  - `R2_PUBLIC_BASE_URL` = the `*.r2.dev` URL from step 1

Expected: Five values recorded for the next task. No commit.

---

## Task 2: Add R2 env vars to the web env schema

**Files:**

- Modify: `packages/env/src/web/env.server.ts:18`

- [ ] **Step 1: Replace the UPLOADTHING_TOKEN line with the R2 vars**

Find:

```ts
UPLOADTHING_TOKEN: z.string().min(1).optional(); // UploadThing API token. Build-time optional; the upload route throws at runtime when missing.
```

Replace with:

```ts
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_PUBLIC_BASE_URL: z.string().url()
```

- [ ] **Step 2: Run type check to verify the schema parses**

Run: `pnpm --filter @tsu-stack/env check`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add packages/env/src/web/env.server.ts
git commit -m "feat(env): add R2 storage env vars"
```

---

## Task 3: Add R2 env values to local dev vars

**Files:**

- Modify: `apps/web/.dev.vars` (create if missing)

- [ ] **Step 1: Create or update `apps/web/.dev.vars` with the five R2 vars**

```toml
R2_ACCOUNT_ID=<from Task 1>
R2_ACCESS_KEY_ID=<from Task 1>
R2_SECRET_ACCESS_KEY=<from Task 1>
R2_BUCKET=personal-hub-media
R2_PUBLIC_BASE_URL=<from Task 1, the r2.dev URL>
```

- [ ] **Step 2: Verify it's gitignored (Cloudflare Workers convention)**

Run: `cat .gitignore | grep dev.vars`
Expected: `.dev.vars` listed (or `*.dev.vars`). If not, add it.

- [ ] **Step 3: No commit** — `.dev.vars` contains secrets and must not be committed.

---

## Task 4: Swap dependencies in the workspace catalog

**Files:**

- Modify: `pnpm-workspace.yaml:123-124`

- [ ] **Step 1: Remove uploadthing entries, add files-sdk**

Find:

```yaml
uploadthing: 7.3.0
"@uploadthing/react": 7.3.0
```

Replace with:

```yaml
"files-sdk": ^2.0.0
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: `files-sdk` added, `uploadthing` and `@uploadthing/react` removed, no peer dep warnings about uploadthing.

- [ ] **Step 3: Verify versions**

Run: `cat apps/web/node_modules/files-sdk/package.json | grep version | head -1`
Expected: `2.0.x` (or current)

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(deps): swap uploadthing for files-sdk"
```

---

## Task 5: Create the storage client

**Files:**

- Create: `packages/api/src/lib/storage/index.ts`

- [ ] **Step 1: Create the directory and file**

```ts
import { Files } from "files-sdk";
import { r2 } from "files-sdk/r2";

import { ENV_WEB_SERVER } from "@tsu-stack/env/web/env.server";

export const files = new Files({
  adapter: r2({
    accountId: ENV_WEB_SERVER.R2_ACCOUNT_ID,
    accessKeyId: ENV_WEB_SERVER.R2_ACCESS_KEY_ID,
    secretAccessKey: ENV_WEB_SERVER.R2_SECRET_ACCESS_KEY,
    bucket: ENV_WEB_SERVER.R2_BUCKET,
    publicBaseUrl: ENV_WEB_SERVER.R2_PUBLIC_BASE_URL
  })
});
```

- [ ] **Step 2: Verify the type check passes**

Run: `pnpm --filter @tsu-stack/api check`
Expected: passes. If `r2` import path is wrong, check `files-sdk` package exports and adjust.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/lib/storage/index.ts
git commit -m "feat(api): add files-sdk R2 storage client"
```

---

## Task 6: Create the files gateway and TanStack Start bridge route

The `useFiles` hook expects a full `files-sdk/api` gateway that speaks the SDK's wire protocol (upload, delete, head, list, url, etc.). The gateway core exposes `handle(req: Request): Promise<Response>` which we can call directly from a TanStack Start API route — no Hono sub-app needed.

**Files:**

- Create: `apps/web/src/server/files-gateway.ts`
- Create: `apps/web/src/routes/api/files/index.ts`

- [ ] **Step 1: Create the gateway at `apps/web/src/server/files-gateway.ts`**

```ts
import { FilesError, createFilesRouter } from "files-sdk";

import { auth } from "@tsu-stack/auth";
import { files } from "@tsu-stack/api/lib/storage";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

export const filesRouter = createFilesRouter({
  files,
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

Notes on the authorization contract:

- `keyPrefix` is **prepended** server-side, so a client that calls `files.upload("avatar.png")` actually writes to `${userId}/avatar.png`. The prefix is stripped from `list`/`url` results, so the client only sees relative paths.
- Throwing `FilesError("Unauthorized", ...)` returns 401; `"ReadOnly"` returns 403.
- `allowedOrigins` provides CSRF protection for state-changing verbs. Add the production domain here too when deploying.

- [ ] **Step 2: Create the TanStack Start bridge at `apps/web/src/routes/api/files/index.ts`**

```ts
import { createFileRoute } from "@tanstack/react-router";

import { filesRouter } from "@/server/files-gateway";

export const Route = createFileRoute("/api/files/")({
  server: {
    handlers: {
      GET: ({ request }) => filesRouter.handle(request),
      POST: ({ request }) => filesRouter.handle(request),
      PUT: ({ request }) => filesRouter.handle(request)
    }
  }
});
```

The router's `handle(request)` is a Web-standard `Request → Response` handler — pass the TanStack Start `Request` straight in and return the `Response`. Per the gateway docs: "GET serves downloads, POST the JSON verbs, and PUT the upload byte path" — no DELETE needed.

- [ ] **Step 3: Type check**

Run: `pnpm --filter @tsu-stack/web check`
Expected: passes. If `filesRouter` import path or `filesRouter.handle()` signature differs (e.g. `handle` is named `fetch` or is async-returning differently), report the actual shape and use it.

- [ ] **Step 4: Smoke-test the gateway via curl**

Start the dev server (`pnpm --filter @tsu-stack/web dev`), then in another terminal:

```bash
# Unauthenticated — should 401
curl -i -X POST http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -d '{}'

# Authenticated — replace cookie with a valid session token from DevTools
curl -X POST http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your-session-token>" \
  -d '{"action":"upload","contentType":"image/png","size":1024}'
```

Expected: first call returns 401; second call returns a JSON body with the presigned upload contract (exact wire shape is internal to `files-sdk` — log the response and verify it contains a presigned `url` and `key`). If R2 credentials are not yet configured in `.dev.vars` (Task 1 not done), the second call may fail with a 500 from R2 rejecting the signature — that's expected, the goal of this step is to confirm the auth gate and gateway wire-up work, not end-to-end R2 access.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/files-gateway.ts apps/web/src/routes/api/files/index.ts
git commit -m "feat(web): mount files-sdk gateway at /api/files"
```

---

## Task 7: Install the shadcn `upload-progress` component

**Files:**

- Create: `apps/web/src/components/files-sdk/upload-progress.tsx` (or wherever shadcn installs it)

- [ ] **Step 1: Verify the files-sdk registry is configured**

Run: `cat apps/web/components.json | head -30`

The `files-sdk` 2.0 ships a shadcn registry. If the user's `components.json` does not include `@files-sdk` as a registry, add it. Check the files-sdk 2.0 docs for the exact registry URL and add it to `components.json` under `registries`.

- [ ] **Step 2: Install the component**

Run: `pnpm dlx shadcn@latest add @files-sdk/upload-progress --cwd apps/web`

Expected: a new file at `apps/web/src/components/files-sdk/upload-progress.tsx` (or similar path under the shadcn components dir).

- [ ] **Step 3: Verify the import works**

Open the installed file and confirm it imports `useFiles` from `files-sdk/react`. If the import path differs, adjust the consumer in Task 8.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): install files-sdk UploadProgress component"
```

---

## Task 8: Rewrite ImageField to use `useFiles` and `<UploadProgress>`

**Files:**

- Modify: `apps/web/src/shared/form/image-field.tsx`

- [ ] **Step 1: Replace the entire file**

The `useFiles` hook from `files-sdk/react` exposes ambient state (`files.isUploading`, `files.error`) and the `<UploadProgress>` component reads `files.progress` / `files.uploads` automatically. `files.upload(file)` returns `{ key, size, type, etag }` — no `publicUrl` — so we call `files.url(key)` to resolve the public URL after upload completes.

```tsx
"use client";

import { useStore } from "@tanstack/react-form";
import { X } from "lucide-react";
import { useRef } from "react";
import { useFiles } from "files-sdk/react";

import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@tsu-stack/ui/components/field";

import { UploadProgress } from "@/components/files-sdk/upload-progress";

import { useFieldContext } from "./form-contexts";

type ImageFieldProps = {
  label?: string;
  description?: string;
  className?: string;
};

function ImageField(props: ImageFieldProps) {
  const field = useFieldContext<string>();
  const value = useStore(field.form.store, (state) => state.values[field.name]);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useFiles({ endpoint: "/api/files" });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { key } = await files.upload(file);
      const publicUrl = await files.url(key);
      field.handleChange(publicUrl);
    } catch {
      // files.error is rendered below
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleClear() {
    field.handleChange("");
  }

  return (
    <Field>
      {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
      <div className="flex flex-col gap-2">
        {value ? (
          <div className="relative inline-flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={value}
              alt={props.label ?? "Uploaded image"}
              width={96}
              height={96}
              className="size-full object-contain p-1"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 size-5 rounded-full"
              onClick={handleClear}
              aria-label="Remove image"
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={files.isUploading}
        >
          {files.isUploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
        </Button>
        <UploadProgress files={files} />
      </div>
      {props.description ? <FieldDescription>{props.description}</FieldDescription> : null}
      {files.error ? <FieldError errors={[{ message: files.error.message }]} /> : null}
    </Field>
  );
}

export { ImageField };
```

- [ ] **Step 2: Type check**

Run: `pnpm --filter @tsu-stack/web check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/form/image-field.tsx
git commit -m "feat(web): rewrite ImageField with useFiles + UploadProgress"
```

---

## Task 9: Remove old uploadthing code

**Files:**

- Delete: `apps/web/src/server/uploadthing.ts`
- Delete: `apps/web/src/routes/api/uploadthing/`
- Delete: `apps/web/src/shared/lib/uploadthing/`

- [ ] **Step 1: Delete the old files**

```bash
rm -rf apps/web/src/server/uploadthing.ts
rm -rf apps/web/src/routes/api/uploadthing
rm -rf apps/web/src/shared/lib/uploadthing
```

- [ ] **Step 2: Verify no remaining references**

Run: `rg -l "uploadthing" apps/ packages/`
Expected: no results

- [ ] **Step 3: Run full type check and lint**

Run: `pnpm check`
Expected: passes. The remaining `await onRevokeAll?.()` error in `packages/ui/components/auth-session-manager.tsx:327` is pre-existing and unrelated.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): remove uploadthing code"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm --filter @tsu-stack/web dev`
Expected: starts on `http://localhost:3000`

- [ ] **Step 2: Sign in and open the project edit page**

Navigate to `http://localhost:3000/dashboard/projects/<some-id>`

- [ ] **Step 3: Upload an image**

Click "Upload image" in the Project logo field, pick a small PNG (under 4 MB). Expected:

- Button text changes to "Uploading..."
- Within ~1–2 seconds, the image preview appears at the public URL
- Button text changes back to "Replace image"
- No errors in the browser console

- [ ] **Step 4: Verify the file landed in R2**

Go to Cloudflare dashboard → R2 → `personal-hub-media` → Objects. Expected: a key like `<your-user-id>/<uuid>` with the image.

- [ ] **Step 5: Verify the public URL is reachable**

Open `https://<bucket>.r2.dev/<user-id>/<uuid>` in an incognito window. Expected: the image loads without auth.

- [ ] **Step 6: Verify the form saves the URL**

Click "Save" on the project edit page. Expected: the project is saved, and reloading the page shows the same image preview.

- [ ] **Step 7: Verify image type validation**

Try uploading a `.pdf` (or any non-image). Expected: 400 error, `FieldError` displays the message, no upload to R2.

- [ ] **Step 8: Verify size validation**

Try uploading a > 4 MB image. Expected: 400 error, no upload to R2.

---

## Rollback

If something breaks and you need to revert:

```bash
git revert --no-commit HEAD~9..HEAD
git commit -m "revert: R2 files-sdk integration"
pnpm install
```

Then restore the previous `UPLOADTHING_TOKEN` env var and the `pnpm-workspace.yaml` entries.
