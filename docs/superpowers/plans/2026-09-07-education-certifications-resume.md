# Education + Certifications on Generated Resumes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-user `education` and `certification` source-of-truth tables feeding RenderCV resume generation (include-when-present), with CRUD in profile/settings, resume-import extraction, and hub chat read/add/edit tools.

**Architecture:** Two new DB tables + repositories following the `experience` pattern (no Cubby, no pagination, no portfolioEntry). Shared Zod contracts in `@tsu-stack/core` module folders. oRPC routers mirror `experiences.router.ts` (list/get/create/update/reorder/delete). `packages/pdf` gains optional `educations`/`certifications` arrays on `ResumePdfPortfolio`; both resume render callers (default-resume sync + apply-package) populate them. Resume-import workflow gains two extract collections; hub chat gets two propose tools + two list tools mirroring the evidence pattern.

**Tech Stack:** Drizzle + Postgres, oRPC, TanStack Start/Query/Form, Mastra 1.54, RenderCV (engineeringresumes theme).

**Spec:** `docs/superpowers/specs/2026-09-07-education-certifications-resume-design.md` (grill-locked — do not re-litigate decisions).

**Read before starting:**

- `.agents/workflow.md` — validation timing, migration safety
- `.agents/core.md` — shared contract propagation
- `.agents/orpc.md` — procedure conventions
- `.agents/end-to-end-features.md` — cross-package flow
- `apps/agent/AGENTS.md` — **critical: after any new `@tsu-stack/core` / `@tsu-stack/db` export, run `pnpm --filter @tsu-stack/agent rebuild:core-cache` / `rebuild:db-cache` or the agent crashes with missing-export errors**

**Conventions used throughout:**

- New DB exports → `packages/db/src/schema/index.ts` + `packages/db/src/types/index.ts` + `packages/db/src/repositories/index.ts`
- New core exports → `packages/core/src/index.ts`
- Run `pnpm --filter <pkg> check` (format/lint/typecheck) after each task; `vp check --fix` if formatting fails
- Migrations: `pnpm --filter @tsu-stack/db db:generate` from repo root via `vpx`/`vp run`; review SQL; `pnpm dev` applies
- Commit after every task: `git add <files> && git commit -m "<message>"`

---

## Task 1: DB schema, relations, types, repositories

**Files:**

- Create: `packages/db/src/schema/education.schema.ts`
- Create: `packages/db/src/schema/certification.schema.ts`
- Modify: `packages/db/src/schema/index.ts` (add 2 exports)
- Modify: `packages/db/src/schema/relations.ts` (add 2 relation blocks)
- Create: `packages/db/src/types/education.schema.ts`
- Create: `packages/db/src/types/certification.schema.ts`
- Modify: `packages/db/src/types/index.ts` (add 2 exports)
- Create: `packages/db/src/repositories/education.repository.ts`
- Create: `packages/db/src/repositories/certification.repository.ts`
- Modify: `packages/db/src/repositories/index.ts` (add 2 exports)

- [ ] **Step 1: Create `education.schema.ts`**

```ts
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const education = pgTable(
  "education",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    school: text("school").notNull(),
    degree: text("degree").notNull(),
    field: text("field"),
    location: text("location"),
    fromDate: text("from_date"),
    toDate: text("to_date"),
    isPresent: boolean("is_present").default(false),
    description: text("description"),
    gpa: text("gpa"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [index("education_user_id_sort_order_idx").on(table.userId, table.sortOrder)]
);
```

- [ ] **Step 2: Create `certification.schema.ts`**

```ts
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.schema.ts";

export const certification = pgTable(
  "certification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    issuer: text("issuer").notNull(),
    issuedAt: text("issued_at"),
    expiresAt: text("expires_at"),
    credentialUrl: text("credential_url"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [index("certification_user_id_sort_order_idx").on(table.userId, table.sortOrder)]
);
```

- [ ] **Step 3: Register exports.** In `packages/db/src/schema/index.ts` add:

```ts
export * from "./education.schema.ts";
export * from "./certification.schema.ts";
```

In `packages/db/src/schema/relations.ts`, inside the returned object (place near the `experience` block):

```ts
    education: {
      user: r.one.user({
        from: r.education.userId,
        to: r.user.id
      })
    },
    certification: {
      user: r.one.user({
        from: r.certification.userId,
        to: r.user.id
      })
    },
```

Create `packages/db/src/types/education.schema.ts` (and mirror for certification) following `packages/db/src/types/experience.schema.ts`:

```ts
import { education } from "../schema/index.ts";

const educationSchemaInsert = education.$inferInsert;
const educationSchemaSelect = education.$inferSelect;

export type EducationSchemaInsert = typeof educationSchemaInsert;
export type EducationSchemaSelect = typeof educationSchemaSelect;
```

In `packages/db/src/types/index.ts` add `export type * from "./education.schema.ts";` + certification.

- [ ] **Step 4: Create `education.repository.ts`**

Model: `experience.repository.ts` but simple — no pagination, no portfolio. Full file:

```ts
import { and, asc, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { education } from "../schema/education.schema.ts";

export type EducationEntity = InferSelectModel<typeof education>;

export type CreateEducationData = Omit<
  InferInsertModel<typeof education>,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateEducationData = Partial<Omit<CreateEducationData, "userId">>;
export type ReorderEducationItem = { id: string; sortOrder: number };

export const educationRepository = {
  async findAllByUserId(userId: string) {
    return getDb().query.education.findMany({
      where: eq(education.userId, userId),
      orderBy: [asc(education.sortOrder), asc(education.id)]
    });
  },

  async findByIdForUser(id: string, userId: string) {
    const [row] = await getDb()
      .select()
      .from(education)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async create(input: CreateEducationData) {
    const all = await educationRepository.findAllByUserId(input.userId);
    const nextSortOrder = all.length > 0 ? Math.max(...all.map((e) => e.sortOrder)) + 1 : 0;
    const [row] = await getDb()
      .insert(education)
      .values({ ...input, sortOrder: input.sortOrder ?? nextSortOrder })
      .returning();
    return row ?? null;
  },

  async update(id: string, userId: string, input: UpdateEducationData) {
    const [row] = await getDb()
      .update(education)
      .set(input)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .returning();
    return row ?? null;
  },

  /** Persist display order; all ids must belong to the user. */
  async reorder(userId: string, items: ReorderEducationItem[]) {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    const owned = await educationRepository.findAllByUserId(userId);
    const ownedIds = new Set(owned.map((row) => row.id));
    for (const id of ids) {
      if (!ownedIds.has(id)) throw new Error("education_reorder_foreign_id");
    }
    await getDb().transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(education)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(education.id, item.id), eq(education.userId, userId)));
      }
    });
  },

  async delete(id: string, userId: string) {
    const deleted = await getDb()
      .delete(education)
      .where(and(eq(education.id, id), eq(education.userId, userId)))
      .returning({ id: education.id });
    return deleted[0] ?? null;
  }
};
```

- [ ] **Step 5: Create `certification.repository.ts`** — identical shape: replace `education`→`certification`, `Education`→`Certification`, school/degree fields irrelevant (insert values come from `input`). Same functions; no gpa/location columns to worry about (values flow through `input`).

- [ ] **Step 6: Register repos in `packages/db/src/repositories/index.ts`:**

```ts
export {
  educationRepository,
  type EducationEntity,
  type CreateEducationData,
  type UpdateEducationData,
  type ReorderEducationItem
} from "./education.repository.ts";
export {
  certificationRepository,
  type CertificationEntity,
  type CreateCertificationData,
  type UpdateCertificationData,
  type ReorderCertificationItem
} from "./certification.repository.ts";
```

- [ ] **Step 7: Generate migration.** Run: `pnpm --filter @tsu-stack/db db:generate`
      Expected: new `packages/db/migrations/<timestamp>_*/migration.sql` with `CREATE TABLE "education"`, `CREATE TABLE "certification"`, 2 indexes, 2 FKs. Review the SQL — verify `ON DELETE cascade` on both FKs and no drop statements.

- [ ] **Step 8: Check.** Run: `pnpm --filter @tsu-stack/db check`. Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add packages/db
git commit -m "feat(db): education + certification tables and repositories"
```

---

## Task 2: Core contracts (`@tsu-stack/core`)

**Files:**

- Create: `packages/core/src/education/types.ts`
- Create: `packages/core/src/education/index.ts`
- Create: `packages/core/src/certification/types.ts`
- Create: `packages/core/src/certification/index.ts`
- Modify: `packages/core/src/index.ts` (add 2 exports)

- [ ] **Step 1: Write failing tests.** Create `packages/core/src/education/__tests__/types.test.ts` (mirror existing core tests' framework — check a sibling like `packages/core/src/ai-settings/__tests__/model-provider-binding.test.ts` for imports/runner):

```ts
import { describe, expect, it } from "vitest";

import {
  CreateEducationInputSchema,
  EducationOutputSchema,
  UpdateEducationInputSchema
} from "#@/education/types";

describe("education contracts", () => {
  it("accepts a full entry", () => {
    const parsed = CreateEducationInputSchema.safeParse({
      school: "Cairo University",
      degree: "Bachelor of Science",
      field: "Computer Science",
      location: "Cairo, Egypt",
      fromDate: "2015-09",
      toDate: "2019-06",
      isPresent: false,
      description: "Graduated with honors",
      gpa: "3.8/4.0"
    });
    expect(parsed.success).toBe(true);
  });

  it("requires school and degree, allows the rest empty", () => {
    const parsed = CreateEducationInputSchema.safeParse({ school: "X", degree: "BSc" });
    expect(parsed.success).toBe(true);
    expect(CreateEducationInputSchema.safeParse({ school: "X" }).success).toBe(false);
    expect(CreateEducationInputSchema.safeParse({ degree: "BSc" }).success).toBe(false);
  });

  it("update schema is partial", () => {
    expect(UpdateEducationInputSchema.safeParse({ gpa: "3.9/4.0" }).success).toBe(true);
    expect(UpdateEducationInputSchema.safeParse({}).success).toBe(true);
  });

  it("output schema validates a row shape", () => {
    const parsed = EducationOutputSchema.safeParse({
      id: "e1",
      school: "Cairo University",
      degree: "Bachelor of Science",
      field: null,
      location: null,
      fromDate: null,
      toDate: null,
      isPresent: false,
      description: null,
      gpa: null,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    expect(parsed.success).toBe(true);
  });
});
```

Mirror as `packages/core/src/certification/__tests__/types.test.ts` (name+issuer required; issuedAt/expiresAt/credentialUrl/description optional).

- [ ] **Step 2: Run tests to verify they fail.** Run: `pnpm --filter @tsu-stack/core test -- src/education` (use the repo's test invocation — check `packages/core/package.json` scripts). Expected: FAIL (module not found).

- [ ] **Step 3: Write the contracts.** `packages/core/src/education/types.ts` — follow the `packages/core/src/experience/types.ts` template (Zod + `satisfies` against `@tsu-stack/db/types`):

```ts
import { z } from "zod";

import { type EducationSchemaInsert, type EducationSchemaSelect } from "@tsu-stack/db/types";

/** ISO year-month or year; blank coerces to null. */
const optionalDate = z
  .union([z.string(), z.literal("")])
  .nullable()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

export const EducationOutputSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  field: z.string().nullable(),
  location: z.string().nullable(),
  fromDate: z.string().nullable(),
  toDate: z.string().nullable(),
  isPresent: z.boolean(),
  description: z.string().nullable(),
  gpa: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
}) satisfies z.ZodType<
  Omit<EducationSchemaSelect, "userId"> & { createdAt: string; updatedAt: string }
>;

export const CreateEducationInputSchema = z.object({
  school: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  field: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  fromDate: optionalDate,
  toDate: optionalDate,
  isPresent: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
  gpa: z.string().max(40).nullable().optional()
}) satisfies z.ZodType<
  Omit<EducationSchemaInsert, "id" | "userId" | "createdAt" | "updatedAt" | "sortOrder">
>;

export const UpdateEducationInputSchema = CreateEducationInputSchema.partial().extend({
  school: z.string().min(1).max(200).optional(),
  degree: z.string().min(1).max(200).optional()
});

export const EducationListOutputSchema = z.array(EducationOutputSchema);

export type EducationOutput = z.infer<typeof EducationOutputSchema>;
export type CreateEducationInput = z.infer<typeof CreateEducationInputSchema>;
export type UpdateEducationInput = z.infer<typeof UpdateEducationInputSchema>;
```

`packages/core/src/education/index.ts`: `export * from "#@/education/types";`

`packages/core/src/certification/types.ts`:

```ts
import { z } from "zod";

import { type CertificationSchemaInsert, type CertificationSchemaSelect } from "@tsu-stack/db/types";

const optionalDate = /* same helper as education — duplicate locally (no shared util unless a 3rd consumer appears) */;

export const CertificationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  credentialUrl: z.string().nullable(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CreateCertificationInputSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  credentialUrl: z.string().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  description: z.string().max(2000).nullable().optional()
});

export const UpdateCertificationInputSchema = CreateCertificationInputSchema.partial().extend({
  name: z.string().min(1).max(200).optional(),
  issuer: z.string().min(1).max(200).optional()
});

export const CertificationListOutputSchema = z.array(CertificationOutputSchema);

export type CertificationOutput = z.infer<typeof CertificationOutputSchema>;
export type CreateCertificationInput = z.infer<typeof CreateCertificationInputSchema>;
export type UpdateCertificationInput = z.infer<typeof UpdateCertificationInputSchema>;
```

(`credentialUrl` refinement: accept any http(s) URL string or empty → null; adjust to whatever the local `zod` version supports cleanly — check how core validates URLs elsewhere, e.g. contact/website handling in `packages/core`.)

- [ ] **Step 4: Re-export from `packages/core/src/index.ts`:** add `export * from "#@/education/index";` + `export * from "#@/certification/index";` next to the existing module exports.

- [ ] **Step 5: Run tests to verify they pass.** Run the core test suite for the two new test files. Expected: PASS.

- [ ] **Step 6: Check + commit**

```bash
pnpm --filter @tsu-stack/core check
git add packages/core
git commit -m "feat(core): education + certification shared contracts"
```

---

## Task 3: oRPC routers + mount + resume-sync hook

**Files:**

- Create: `packages/api/src/routers/educations.router.ts`
- Create: `packages/api/src/routers/certifications.router.ts`
- Modify: `packages/api/src/routers/index.ts` (mount both)
- Modify: `packages/api/src/lib/resume/sync-portfolio-default-resume.ts` (fetch + pass new data)

- [ ] **Step 1: Write `educations.router.ts`** following `experiences.router.ts` (list/get/create/update/reorder/delete, no listPage — no Cubby):

```ts
import {
  CreateEducationInputSchema,
  EducationListOutputSchema,
  EducationOutputSchema,
  ReorderInputSchema,
  ReorderResponseSchema,
  UpdateEducationInputSchema
} from "@tsu-stack/core";
import { educationRepository } from "@tsu-stack/db";
import { ORPCError } from "@orpc/server";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { schedulePortfolioDefaultResumeSync } from "#@/lib/resume/sync-portfolio-default-resume";
import { toEducationOutput } from "#@/routers/education.mappers";
import { DeleteResponseSchema } from "@tsu-stack/core";

export const educationsRouter = {
  list: protectedProcedure
    .route({ description: "List the current user's education entries", method: "GET" })
    .output(EducationListOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const rows = await educationRepository.findAllByUserId(userId);
      return rows.map(toEducationOutput);
    }),

  get: protectedProcedure
    .route({ description: "Get one education entry", method: "GET" })
    .input(z.object({ id: z.string().min(1) })) // match experiences.router get input shape
    .output(EducationOutputSchema)
    .handler(async ({ input, context }) => {
      const row = await educationRepository.findByIdForUser(input.id, context.session.user.id);
      if (!row) throw new ORPCError("NOT_FOUND");
      return toEducationOutput(row);
    }),

  create: protectedProcedure
    .route({ description: "Create an education entry", method: "POST" })
    .input(CreateEducationInputSchema)
    .output(EducationOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const row = await educationRepository.create({ ...input, userId });
      schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      return toEducationOutput(row!);
    }),

  update: protectedProcedure
    .route({ description: "Update an education entry", method: "PUT" })
    .input(z.object({ id: z.string().min(1) }).extend(UpdateEducationInputSchema.shape)) // follow experiences.router.update exact input pattern
    .output(EducationOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { id, ...patch } = input;
      const row = await educationRepository.update(id, userId, patch);
      if (!row) throw new ORPCError("NOT_FOUND");
      schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      return toEducationOutput(row);
    }),

  reorder: protectedProcedure
    .route({ description: "Reorder education entries", method: "POST" })
    .input(ReorderInputSchema)
    .output(ReorderResponseSchema)
    .handler(async ({ input, context }) => {
      await educationRepository.reorder(context.session.user.id, input.items);
      return { success: true };
    }),

  delete: protectedProcedure
    .route({ description: "Delete an education entry", method: "DELETE" })
    .input(z.object({ id: z.string().min(1) }))
    .output(DeleteResponseSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const deleted = await educationRepository.delete(input.id, userId);
      if (!deleted) throw new ORPCError("NOT_FOUND");
      schedulePortfolioDefaultResumeSync({ userId, mediaBucket: context.mediaBucket });
      return { success: true };
    })
};
```

Notes:

- Copy the **exact** input shapes and error conventions (`typed .errors(...)`) from `experiences.router.ts` — do not invent (`NOT_FOUND` shape, get/reorder/delete input objects must match the sibling router verbatim).
- Add a thin `packages/api/src/routers/education.mappers.ts` with `toEducationOutput(row)` (dates → ISO strings, booleans defaulted) following `portfolio.mappers.ts` `toExperienceOutput`. Mirror for certification.
- Mount in `packages/api/src/routers/index.ts`: `educations: educationsRouter,` + `certifications: certificationsRouter,` (import + one object key each, like `experiences`).
- `ReorderInputSchema`/`ReorderResponseSchema`/`DeleteResponseSchema` already exist in `@tsu-stack/core/src/common/types.ts`.

- [ ] **Step 2: Write `certifications.router.ts`** — identical slice, `certificationRepository` + `Certification*` schemas + `toCertificationOutput`.

- [ ] **Step 3: Check.** Run: `pnpm --filter @tsu-stack/api check`. Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api
git commit -m "feat(api): education + certification routers wired into app router"
```

---

## Task 4: Resume PDF pipeline (TDD)

**Files:**

- Modify: `packages/pdf/src/types.ts` (portfolio gains optional arrays)
- Modify: `packages/pdf/src/map-rendercv-yaml.ts` (education + certifications sections)
- Test: `packages/pdf/src/__tests__/map-rendercv-yaml.test.ts`

- [ ] **Step 1: Write failing tests** in `map-rendercv-yaml.test.ts` (reuse `baseInput` helper):

```ts
it("renders education entries when present (order: experience → education → projects)", () => {
  const doc = parseYaml(
    baseInput({
      portfolio: {
        ...baseInput().portfolio,
        educations: [
          {
            school: "Cairo University",
            degree: "Bachelor of Science in Computer Science",
            field: "Computer Science",
            location: "Cairo, Egypt",
            fromDate: "2015-09-01",
            toDate: "2019-06-30",
            isPresent: false,
            description:
              "<ul><li>Graduated Magna Cum Laude</li><li>Relevant coursework: Algorithms</li></ul>",
            gpa: "3.8/4.0"
          }
        ]
      }
    })
  ).doc;
  const education = doc.cv.sections?.education;
  expect(education).toBeDefined();
  expect(education?.[0]).toMatchObject({
    institution: "Cairo University",
    studyType: "Bachelor of Science in Computer Science",
    area: "Computer Science",
    location: "Cairo, Egypt",
    start_date: "2015-09",
    end_date: "2019-06"
  });
  expect(education?.[0]?.highlights).toEqual([
    "Graduated Magna Cum Laude",
    "Relevant coursework: Algorithms",
    "GPA: 3.8/4.0"
  ]);
  const keys = Object.keys(doc.cv.sections ?? {});
  expect(keys.indexOf("education")).toBeGreaterThan(keys.indexOf("experience"));
  expect(keys.indexOf("education")).toBeLessThan(keys.indexOf("projects"));
});

it("education isPresent renders open-ended end date (RenderCV 'present', same as experience)", () => {
  const doc = parseYaml(
    baseInput({
      portfolio: {
        ...baseInput().portfolio,
        educations: [
          {
            school: "Cairo University",
            degree: "BSc",
            field: null,
            location: null,
            fromDate: "2024-09-01",
            toDate: null,
            isPresent: true,
            description: null,
            gpa: null
          }
        ]
      }
    })
  ).doc;
  expect(doc.cv.sections?.education?.[0]?.end_date).toBe("present");
});

it("omits education section when no rows", () => {
  const doc = parseYaml(baseInput({})).doc; // baseInput has no educations
  expect(doc.cv.sections?.education).toBeUndefined();
});

it("renders certifications as one-liners with link and dates", () => {
  const doc = parseYaml(
    baseInput({
      portfolio: {
        ...baseInput().portfolio,
        certifications: [
          {
            name: "AWS Certified Solutions Architect - Associate",
            issuer: "Amazon Web Services",
            issuedAt: "2025-03-01",
            expiresAt: "2028-03-01",
            credentialUrl: "https://credverify.example.com/abc",
            description: null
          },
          {
            name: "Project Management Professional (PMP)",
            issuer: "Project Management Institute",
            issuedAt: "2024-06-01",
            expiresAt: null,
            credentialUrl: null,
            description: null
          }
        ]
      }
    })
  ).doc;
  const certs = doc.cv.sections?.certifications;
  expect(certs).toEqual([
    "[AWS Certified Solutions Architect - Associate](https://credverify.example.com/abc) — Amazon Web Services, Mar 2025 · Expires Mar 2028",
    "Project Management Professional (PMP) — Project Management Institute, Jun 2024"
  ]);
});

it("omits certifications section when no rows", () => {
  const doc = parseYaml(baseInput({})).doc;
  expect(doc.cv.sections?.certifications).toBeUndefined();
});
```

Also update the existing absence assertion at `map-rendercv-yaml.test.ts:67` — keep it (education absent when no rows) but rename/scope it so the new presence tests live alongside.

- [ ] **Step 2: Run to verify failure.** Run: `pnpm --filter @tsu-stack/pdf test:unit` (vp test run — same caveat as Task 2; check package scripts). Expected: FAIL (no `educations` on portfolio type; no sections).

- [ ] **Step 3: Implement.**

`packages/pdf/src/types.ts` — add to `ResumePdfPortfolio` (optional so existing callers/tests compile until Task 5 populates them):

```ts
  educations?: Array<{
    school: string;
    degree: string;
    field: string | null;
    location: string | null;
    fromDate: string | null;
    toDate: string | null;
    isPresent: boolean;
    description: string | null;
    gpa: string | null;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issuedAt: string | null;
    expiresAt: string | null;
    credentialUrl: string | null;
    description: string | null;
  }>;
```

`packages/pdf/src/map-rendercv-yaml.ts` — add helpers + wire into `buildCv` between `experience` and `projects`:

```ts
import { extractBullets, summaryPlainText } from "#@/html"; // already imported

/** "2025-03-01" → "Mar 2025" for certification one-liners. */
function toCertDisplayDate(raw: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const ymd = raw.trim().match(/^(\d{4})-(\d{2})/);
  if (!ymd) return raw.trim(); // already display text (year etc.) — pass through
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const month = Number(ymd[2]);
  if (month < 1 || month > 12) return ymd[1]!;
  return `${months[month - 1]} ${ymd[1]}`;
}

function educationEntries(educations: ResumePdfPortfolio["educations"] = []) {
  return educations.map((edu) => {
    const entry: Record<string, unknown> = {
      institution: edu.school,
      studyType: edu.degree
    };
    if (edu.field?.trim()) entry.area = edu.field.trim();
    if (edu.location?.trim()) entry.location = edu.location.trim();
    const start = toRenderCvDate(edu.fromDate);
    const end = edu.isPresent ? "present" : toRenderCvDate(edu.toDate);
    if (start) entry.start_date = start;
    if (end) entry.end_date = end;
    const highlights = extractBullets(edu.description ?? "");
    if (edu.gpa?.trim()) highlights.push(`GPA: ${edu.gpa.trim()}`);
    if (highlights.length > 0) entry.highlights = highlights;
    return entry;
  });
}

function certificationEntries(certifications: ResumePdfPortfolio["certifications"] = []) {
  return certifications.map((cert) => {
    const name = cert.credentialUrl?.trim()
      ? `[${cert.name}](${cert.credentialUrl.trim()})`
      : cert.name;
    const parts = [toCertDisplayDate(cert.issuedAt), toCertDisplayDate(cert.expiresAt)]
      .filter(Boolean)
      .map((d, i) => (i === 1 ? `Expires ${d}` : d));
    const tail = parts.length > 0 ? `, ${parts.join(" · ")}` : "";
    return `${name} — ${cert.issuer}${tail}`;
  });
}
```

In `buildCv`, after the `experience` block and before `projects`:

```ts
const education = educationEntries(input.portfolio.educations);
if (education.length > 0) sections.education = education;
```

After the `skills` block:

```ts
const certifications = certificationEntries(input.portfolio.certifications);
if (certifications.length > 0) sections.certifications = certifications;
```

- [ ] **Step 4: Run tests.** Expected: PASS.

- [ ] **Step 5: Populate both render callers.**

`packages/api/src/lib/resume/sync-portfolio-default-resume.ts`:

- Import `educationRepository, certificationRepository` from `@tsu-stack/db/repositories`.
- In `fetchPortfolioData`, fetch both via `findAllByUserId(userId)` (no portfolio opt-in — include-when-present per spec) and return `educations`/`certifications` mapped to the `ResumePdfPortfolio` shapes (direct field copy; `isPresent: row.isPresent ?? false`).

`packages/api/src/lib/application/accept-apply-package.ts` (line ~265 `const portfolio: ResumePdfPortfolio = {`):

- Fetch all education + certification rows for `userId` near the other live-data fetches (~line 128 area) and add `educations: [...]` / `certifications: [...]` to the portfolio literal with the same direct mapping. Include-when-present applies to tailored resumes too (spec).

- [ ] **Step 6: Check both packages + commit.**

```bash
pnpm --filter @tsu-stack/pdf check && pnpm --filter @tsu-stack/api check
git add packages/pdf packages/api
git commit -m "feat(pdf): education + certifications sections in RenderCV resume pipeline"
```

---

## Task 5: Web CRUD in profile settings

**Files:**

- Create: `apps/web/src/pages/dashboard/settings/ui/education-section.tsx`
- Create: `apps/web/src/pages/dashboard/settings/ui/certification-section.tsx`
- Create: `apps/web/src/pages/dashboard/settings/ui/education-form-fields.tsx` (if field groups get large — optional split)
- Modify: `apps/web/src/pages/dashboard/settings/ui/profile-settings.tsx` (mount both sections)
- Shared form wrappers already exist: `@/shared/form` (`useAppForm`, field components), `@/shared/ui/sortable-list` (`SortableList`)

- [ ] **Step 1: Build `education-section.tsx`.** Follow the inline `SortableList` contacts editor in `profile-settings.tsx:456-620`:

- `useQuery(orpcQueryClient.educations.list.queryOptions())` to load rows.
- Read-only list rendered in `SortableList` per row: `school — degree, field` + `fromDate–toDate`/present + gpa + description excerpt; edit/delete icon buttons.
- Edit/create via `EntityFormSheet` + `useAppForm` (seed from the row on edit — mirror `experience-form.tsx:44-54` reset-on-id pattern). Validators: `createZodFormValidator(CreateEducationInputSchema / UpdateEducationInputSchema)`.
- Mutations: `orpcQueryClient.educations.create/update/delete.mutationOptions(...)` with success toast + list invalidation; delete confirms inline (reuse the contacts delete pattern).
- Reorder: `SortableList` with optimistic `reorder` mutation (`{ items: rows.map((r, i) => ({ id: r.id, sortOrder: i })) }`) — copy the contacts editor's save-on-reorder, no cancel/rollback needed at this scale.
- Empty state line: "Add education to include it on generated resumes."

- [ ] **Step 2: Build `certification-section.tsx`** — same pattern; row displays `name — issuer` + `issuedAt–expiresAt` + link icon when `credentialUrl`.

- [ ] **Step 3: Mount both sections in `ProfileSettings`** between the summary/experience-relevant blocks and the contacts editor, with section headers "Education" and "Certifications".

- [ ] **Step 4: Check.** Run: `pnpm --filter @tsu-stack/web check` (web package name — verify via `apps/web/package.json`). Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): education + certifications CRUD in profile settings"
```

---

## Task 6: Resume-import extraction (core + agent + apply)

**Files:**

- Modify: `packages/core/src/onboarding/types.ts` — draft schemas
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/extract-output.schema.ts`
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/extract.step.ts` (prompt + `emptyExtract`)
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/normalize.step.ts`
- Modify: `apps/agent/src/mastra/workflows/resume-import-workflow/format.step.ts`
- Modify: `apps/agent/src/mastra/agents/resume-import-extractor-agent.ts` (instructions)
- Test: `apps/agent/src/mastra/workflows/resume-import-workflow/extract-output.schema.test.ts`
- Modify: `packages/db/src/repositories/onboarding-apply.repository.ts`
- Modify: `packages/api/src/routers/onboarding.router.ts` (apply output schema)

- [ ] **Step 1: Core draft schemas** in `packages/core/src/onboarding/types.ts`:

```ts
export const ResumeImportEducationDraftSchema = z.object({
  clientId: z.string().min(1),
  selected: z.boolean().default(true),
  school: z.string(),
  degree: z.string(),
  field: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
  isPresent: z.boolean().optional(),
  description: z.string().nullable().optional(),
  gpa: z.string().nullable().optional()
});

export const ResumeImportCertificationDraftSchema = z.object({
  clientId: z.string().min(1),
  selected: z.boolean().default(true),
  name: z.string(),
  issuer: z.string(),
  issuedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional()
});
```

Add to `ResumeImportDraftSchema` (`:84-90`): `educations: z.array(ResumeImportEducationDraftSchema).default([])`, `certifications: z.array(ResumeImportCertificationDraftSchema).default([])`. No `includedInPortfolio` on these two (no portfolio table per spec).

- [ ] **Step 2: Failing test** — extend `extract-output.schema.test.ts`:

```ts
it("parses education and certification arrays with defaults", () => {
  const parsed = ResumeExtractOutputSchema.parse({
    profile: { name: "S" },
    educations: [{ school: "Cairo University", degree: "BSc" }],
    certifications: [
      {
        name: "AWS Certified Solutions Architect - Associate",
        issuer: "Amazon Web Services",
        issuedAt: "2025-03"
      }
    ]
  });
  expect(parsed.educations).toHaveLength(1);
  expect(parsed.educations[0]!.isPresent).toBe(false); // default
  expect(parsed.certifications[0]!.expiresAt).toBeNull(); // default null
  expect(parsed.projects).toEqual([]);
});
```

- [ ] **Step 3: Extract schema** (`extract-output.schema.ts`):

```ts
export const ResumeExtractEducationSchema = z.object({
  clientId: z.string().optional().nullable(),
  school: z.string().describe("Institution name"),
  degree: z
    .string()
    .describe(
      "Full degree name, e.g. Bachelor of Science — spell out, abbreviation may be added in parentheses"
    ),
  field: z.string().nullable().optional().describe("Field / major, e.g. Computer Science"),
  location: z.string().nullable().optional(),
  fromDate: z.string().nullable().optional().describe("Start, ISO or year-month text"),
  toDate: z.string().nullable().optional().describe("End, or null if still enrolled"),
  isPresent: z.boolean().optional().describe("true if still enrolled"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Honors, relevant coursework, thesis — keep verbatim"),
  gpa: z.string().nullable().optional().describe("GPA only if stated, verbatim format e.g. 3.8/4.0")
});

export const ResumeExtractCertificationSchema = z.object({
  clientId: z.string().optional().nullable(),
  name: z
    .string()
    .describe("Full official credential name verbatim, acronym may follow in parentheses"),
  issuer: z.string().describe("Issuing organization full name"),
  issuedAt: z.string().nullable().optional().describe("Issue date ISO or year-month"),
  expiresAt: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional()
});
```

Add `educations` + `certifications` arrays (`.default([])`) to `ResumeExtractOutputSchema` (`:74-83`).

- [ ] **Step 4: Prompt + agent instructions.**
- `extract.step.ts:77-95` prompt: change "Return structured data for profile, experiences, projects, and stacks/skills" → add "education, and certifications". Append: "Copy credential names and honors verbatim — never abbreviate an official name that is spelled out."
- `resume-import-extractor-agent.ts` instructions: add output sections "5. education — degrees with school, full degree name, field, dates (isPresent when enrolled), honors/coursework/thesis in description, GPA verbatim when stated" and "6. certifications — full official name verbatim + issuing organization + issue date (+ expiry, credential URL when present)".
- `emptyExtract` (`extract.step.ts:19-32`): return `educations: []`, `certifications: []` too.

- [ ] **Step 5: Normalize.** In `normalize.step.ts`:
- Extend output schema (`:68-121`) with `educations`/`certifications` arrays (draft shapes with `clientId` + `selected`).
- Map rows: `coerceText` school/degree/name/issuer, drop empties (mirror `:126-145`), `assignClientIds` on survivors, trim dates, pass gpa through.
- Add to the final return object (`:268-284`).

- [ ] **Step 6: Format.** `format.step.ts:12-19`: add `educations, certifications` to the `ResumeImportDraftSchema.parse({...})` payload.

- [ ] **Step 7: Apply repo** (`onboarding-apply.repository.ts`):
- Local `OnboardingApplyInput` (`:44-89`): add `educations?: ResumeImportEducationDraft[]; certifications?: ResumeImportCertificationDraft[]`.
- `noSelectedRows` (`:143-146`): include the two new collections.
- New tx step after experiences (`:332-374`) — no portfolioEntry rows (spec: no `portfolioEntryId` on these tables):

```ts
// 5b. Education (selected only; no portfolio opt-in).
const selectedEducations = (draft.educations ?? []).filter((row) => row.selected !== false);
if (selectedEducations.length > 0) {
  const [eduMaxRow] = await tx
    .select({ max: sql<number>`coalesce(max(${education.sortOrder}), -1)`.mapWith(Number) })
    .from(education)
    .where(eq(education.userId, userId));
  let nextEduSort = (eduMaxRow?.max ?? -1) + 1;
  for (const edu of selectedEducations) {
    await tx.insert(education).values({
      id: crypto.randomUUID(),
      userId,
      school: edu.school,
      degree: edu.degree,
      field: edu.field ?? null,
      location: edu.location ?? null,
      fromDate: edu.fromDate ?? null,
      toDate: edu.toDate ?? null,
      isPresent: edu.isPresent ?? false,
      description: edu.description ?? null,
      gpa: edu.gpa ?? null,
      sortOrder: nextEduSort
    });
    nextEduSort += 1;
  }
  educationsCreated = selectedEducations.length;
}
```

Mirror for certifications. Result type (`:91-95`) + return gain `educationsCreated`, `certificationsCreated`. Extend the `OnboardingApplyOutputSchema` in `onboarding.router.ts:31-35` with both counts.

- [ ] **Step 8: Run agent + api + core checks; rebuild Mastra caches** (new core/db exports):

```bash
pnpm --filter @tsu-stack/core check && pnpm --filter @tsu-stack/db check && pnpm --filter @tsu-stack/api check && pnpm --filter @tsu-stack/agent check
pnpm --filter @tsu-stack/agent rebuild:core-cache && pnpm --filter @tsu-stack/agent rebuild:db-cache
```

- [ ] **Step 9: Commit**

```bash
git add packages/core packages/db packages/api apps/agent
git commit -m "feat: extract education + certifications in resume import and onboarding apply"
```

---

## Task 7: Web onboarding review UI

**Files:**

- Create: `apps/web/src/pages/dashboard/onboarding/ui/draft-education-fields.tsx`
- Create: `apps/web/src/pages/dashboard/onboarding/ui/draft-certification-fields.tsx`
- Modify: `apps/web/src/pages/dashboard/onboarding/ui/review-step.tsx`
- Modify: `apps/web/src/features/onboarding/lib/onboarding-session-store.ts` (`OnboardingApplySummary`)
- Modify: `apps/web/src/features/onboarding/api/extract-resume.mutation.ts` (labels + guard)
- Modify: `apps/web/src/features/onboarding/api/apply-onboarding.mutation.ts` (invalidations)
- Modify: `apps/web/src/pages/dashboard/onboarding/ui/done-step.tsx` (summary counts)

- [ ] **Step 1: Field editors** — follow `draft-experience-fields.tsx` exactly (`useAppForm` + `FieldGroup`, `form.reset` keyed on `clientId`). Education fields: school, degree, field, location, fromDate, toDate, isPresent (switch), description (textarea), gpa. Certification fields: name, issuer, issuedAt, expiresAt, credentialUrl, description.

- [ ] **Step 2: Review step wiring** in `review-step.tsx`:
- Tabs (`:470-484`): add `education` and `certifications` tabs — **between Experiences and Projects** (RenderCV section order).
- `counts`/`totals` (`:264-278`), `totalSelected` (`:280`), `canApply` (`:287`), `setAllSelected` union (`:376-395`), `mergeItem`-style handlers — extend for both collections (no portfolio switch; checkbox only).
- `ReviewAccordionItem` tiles (`:185-248`) with the checkbox + accordion + `DraftEducationFields`/`DraftCertificationFields`; tile label `school — degree` / `name — issuer`.

- [ ] **Step 3: Store + mutations.**
- `OnboardingApplySummary` (`onboarding-session-store.ts:15-19`) gains `educations`, `certifications`; `handleApplySuccess` summary type (`onboarding-page.tsx:120`) extends.
- `extract-resume.mutation.ts`: step label for extract → "Extracting experience, education, and certifications"; `isResumeImportDraft` guard (`:28-32`) — do NOT require new keys (old drafts lack them; arrays `.default([])` make them optional).
- `apply-onboarding.mutation.ts`: invalidate the new lists after apply.
- `done-step.tsx:27-30,44-45,57`: add counts to summary line.

- [ ] **Step 4: Check + commit.**

```bash
pnpm --filter @tsu-stack/web check
git add apps/web
git commit -m "feat(web): review education + certifications in onboarding import"
```

---

## Task 8: Hub chat tools (read + HITL propose)

**Files:**

- Create: `packages/core/src/education/propose.ts`, `packages/core/src/certification/propose.ts`
- Create: `apps/agent/src/mastra/tools/list-educations.tool.ts`, `get-education.tool.ts`, `propose-education-change.tool.ts`
- Create: `apps/agent/src/mastra/tools/list-certifications.tool.ts`, `get-certification.tool.ts`, `propose-certification-change.tool.ts`
- Modify: `apps/agent/src/mastra/agents/hub-supervisor.ts` (imports + tools map)
- Modify: `apps/web/src/features/agent-hub/lib/hub-tool-names.ts` (name sets + `lastHubHitlKind` branch)
- Create: `apps/web/src/features/agent-hub/ui/education-change-tool-ui.tsx`, `certification-change-tool-ui.tsx`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx` (dual-key entries)

- [ ] **Step 1: Core propose schemas** — mirror `packages/core/src/evidence/propose.ts:13-46` (`kind` fixed per entity, `op: create|update|delete`, `id?`, `patch` record with entity fields only, `superRefine`: update/delete require `id`, create forbids `id`). Export from the existing `education`/`certification` index files. Rebuild core cache afterwards.

- [ ] **Step 2: Read tools** — mirror `get-experience.tool.ts:12-67` + `list-experiences.tool.ts` verbatim patterns: kebab ids (`list-educations`, `get-education`, `list-certifications`, `get-certification`), no `userId` in input, `context.requestContext?.get?.("userId")` tenant check → empty result, `createDb()` + `runWithDb` + `findByIdForUser`/`findAllByUserId`, plain-JSON output. List tools sort by `sortOrder`.

- [ ] **Step 3: Propose tools** — mirror `propose-evidence-change.tool.ts`: `createTool` with **no `execute`**; description carries the behavior law (propose only, confirm card writes, never invent id, write no user-facing text after the call). Input/output use the core propose schemas.

- [ ] **Step 4: Supervisor registration** — import all 6 tools, add camel keys to the `tools` map (`hub-supervisor.ts:130-188`): `listEducations`, `getEducation`, `proposeEducationChange`, `listCertifications`, `getCertification`, `proposeCertificationChange`. Do **not** add to `requireToolApproval` regex (`:125-129`) — HITL confirm comes from the propose card, like evidence.

- [ ] **Step 5: Web cards + names + toolkit** — mirror the evidence family:
- `hub-tool-names.ts`: `HUB_PROPOSE_EDUCATION_CHANGE_TOOL_NAMES` / `HUB_PROPOSE_CERTIFICATION_CHANGE_TOOL_NAMES` + `isProposeEducationChangeToolName` / `isProposeCertificationChangeToolName` + `lastHubHitlKind` branches (`:1266-1274` pattern) — `kind: "education" | "certification"`.
- Card components: follow `evidence-change-tool-ui.tsx` (`:80-97` fetch row via `orpcQueryClient.educations.get` when `op === "update"`, `:134-144` complete with `{ action, kind, id }`, `:348-383` persist via `orpcClient.educations.create/update/delete` + list invalidations). One thin card per entity; extract a shared base only if the two stay under ~50 duplicated lines.
- `hub-assistant-toolkit.tsx`: `defineToolkit` entries with **both** kebab + camel keys (`:905-906` rule) — human kind for the two propose tools, standalone result renderers for the read tools (`:945-948` pattern).

- [ ] **Step 6: Checks + cache rebuild + commit.**

```bash
pnpm --filter @tsu-stack/core check && pnpm --filter @tsu-stack/agent check && pnpm --filter @tsu-stack/web check
pnpm --filter @tsu-stack/agent rebuild:core-cache
git add packages/core apps/agent apps/web
git commit -m "feat: hub chat read + propose-confirm tools for education and certifications"
```

---

## Task 9: Full validation + hardening

- [ ] **Step 1: Full workspace check.** Run: `pnpm check` (root script — verify name; else loop `pnpm --filter <pkg> check` over agent/api/web/core/db/ui). Expected: pass everywhere.
- [ ] **Step 2: Run all package tests** touched by the plan (core, pdf, agent workflow schema tests). Expected: pass.
- [ ] **Step 3: Manual verification (dev running via `pnpm dev`):**
  1. Settings → profile: add 2 education entries + 1 certification with credential URL; drag to reorder; edit + delete one.
  2. Resume generation: confirm the regenerated default resume PDF shows Education after Experience and a Certifications section (open the R2 PDF).
  3. Delete both education rows → regenerate → no Education section.
  4. Onboarding: upload a resume PDF containing a degree + cert → review step shows both tabs, selections apply, counts in done step.
  5. Hub chat: "add my AWS Solutions Architect cert issued Mar 2025 by AWS" → propose card → Confirm → appears in settings + next generated resume.
- [ ] **Step 4: ai-feature-harness.** Run the [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) skill (hub tools + import extraction shipped) and append lessons to its `LESSONS.md` per `apps/agent/AGENTS.md`.
- [ ] **Step 5: Final commit** of any fixups.

```bash
git add -A
git commit -m "chore: validation fixes for education + certifications feature"
```

---

## Out of scope (do not build)

- Per-generation section-exclusion toggles (documented spec follow-up)
- Cubby list-search for the two entities (no dashboard list pages, no `LIST_QUERY_RESOURCES` additions — avoid the ripple)
- Public portfolio education section; GPA staleness intelligence; RenderCV YAML editing
