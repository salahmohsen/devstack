/**
 * Rescore existing applications with the AI preference match scorer
 * (no re-fetch of pages / no re-harvest of mail).
 *
 * From worktree root:
 *   pnpm dotenvx run -f ./packages/env/.env -- npx --yes tsx \
 *     --tsconfig apps/server/tsconfig.json \
 *     apps/server/scripts/rescore-applications-ai.mts
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { resolveSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  AiJobMatchBatchSchema,
  defaultJobPreference,
  llmRequestContextFields,
  type JobPreference,
  type RuntimeLlmConfig
} from "@tsu-stack/core";

const require = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/db/package.json")
);
const pg = require("pg") as typeof import("pg");

type AppRow = {
  id: string;
  user_id: string;
  title: string;
  company_name: string;
  location: string | null;
  url: string;
  apply_method: string | null;
  salary_range: string | null;
  description: string | null;
  match_score: number | null;
};

async function loadPrefs(pool: import("pg").Pool, userId: string): Promise<JobPreference> {
  const { rows } = await pool.query(`SELECT * FROM job_preference WHERE user_id = $1 LIMIT 1`, [
    userId
  ]);
  const row = rows[0];
  if (!row) return defaultJobPreference();
  return {
    workModes: row.work_modes ?? [],
    roleKeywords: row.role_keywords ?? [],
    salaryMin: row.salary_min,
    salaryCurrency: row.salary_currency,
    minMatchScore: row.min_match_score ?? 60
  };
}

async function scoreBatch(
  sessionToken: string,
  llm: unknown,
  prefs: JobPreference,
  apps: AppRow[]
): Promise<Map<string, { score: number; passed: boolean; reasons: string[] }>> {
  // Call agent generate via workflow-less agent API if available; else reuse harvest scorer through a tiny prompt on the agent.
  // Prefer POST /api/agents/jobPreferenceMatchScorer/generate
  const jobsJson = apps.map((a) => ({
    listingUrl: a.url,
    title: a.title,
    companyName: a.company_name,
    location: a.location,
    workMode: null,
    applyMethod: a.apply_method ?? "unknown",
    salaryRange: a.salary_range,
    description: (a.description ?? "").slice(0, 400) || null
  }));

  const prompt = `Score these jobs for the seeker.

JobPreference (JSON):
${JSON.stringify(prefs, null, 2)}

Jobs (JSON array):
${JSON.stringify(jobsJson, null, 2)}

Return matches[] with listingUrl, score 0-100, passed (true only if score >= minMatchScore ${prefs.minMatchScore} and not excluded), and reasons.
Use semantic role fit — do not treat generic words like "engineer" or "developer" as a strong frontend/react match.`;

  const llmCfg = llm as RuntimeLlmConfig;
  const res = await agentFetch(`/api/agents/jobPreferenceMatchScorer/generate`, {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      // BYO via requestContext (agent model callback reads llmModelId / llmApiKey keys)
      requestContext: llmRequestContextFields(llmCfg),
      structuredOutput: {
        schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  listingUrl: { type: "string" },
                  score: { type: "number" },
                  passed: { type: "boolean" },
                  reasons: { type: "array", items: { type: "string" } }
                },
                required: ["listingUrl", "score", "passed"]
              }
            }
          },
          required: ["matches"]
        }
      }
    }),
    timeoutMs: 120_000,
    sessionToken
  });

  if (!res?.ok) {
    const t = await res?.text().catch(() => "");
    throw new Error(`agent generate failed ${res?.status}: ${t.slice(0, 200)}`);
  }

  const json = (await res.json()) as unknown;
  // Mastra generate responses vary: object | { object } | { result: { object } }
  const candidates = [
    json,
    (json as { object?: unknown })?.object,
    (json as { result?: { object?: unknown } })?.result?.object,
    (json as { data?: unknown })?.data
  ];
  let parsed = null as ReturnType<typeof AiJobMatchBatchSchema.safeParse> | null;
  for (const c of candidates) {
    if (!c) continue;
    const p = AiJobMatchBatchSchema.safeParse(c);
    if (p.success) {
      parsed = p;
      break;
    }
    // sometimes the whole response IS the batch under different keys
    if (typeof c === "object" && c && "matches" in (c as object)) {
      const p2 = AiJobMatchBatchSchema.safeParse(c);
      if (p2.success) {
        parsed = p2;
        break;
      }
    }
  }
  if (!parsed?.success) {
    console.error("unparseable generate response", JSON.stringify(json).slice(0, 800));
    throw new Error("could not parse AI match batch");
  }

  const map = new Map<string, { score: number; passed: boolean; reasons: string[] }>();
  for (const m of parsed.data.matches) {
    const key = m.listingUrl.toLowerCase();
    map.set(key, {
      score: Math.max(0, Math.min(100, Math.round(m.score))),
      passed: m.passed,
      reasons: m.reasons ?? []
    });
  }
  return map;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const { rows: apps } = await pool.query<AppRow>(`
    SELECT id, user_id, title, company_name, location, url, apply_method, salary_range, description, match_score
    FROM application
    ORDER BY created_at
  `);
  console.log(`apps to rescore: ${apps.length}`);
  if (apps.length === 0) {
    await pool.end();
    return;
  }

  const userId = apps[0]!.user_id;
  const prefs = await loadPrefs(pool, userId);
  const sessionToken = await resolveSessionTokenForUser(userId);
  if (!sessionToken) throw new Error("no session for user");
  const llm = await resolveRuntimeAiCredentials(userId, "classify");
  console.log("prefs", prefs);
  console.log("llm", llm.modelId);

  // Batch in chunks of 12 to keep prompts small
  const CHUNK = 12;
  let updated = 0;
  let wouldDrop = 0;

  for (let i = 0; i < apps.length; i += CHUNK) {
    const chunk = apps.slice(i, i + CHUNK);
    console.log(`scoring ${i + 1}-${i + chunk.length}...`);
    const scores = await scoreBatch(sessionToken, llm, prefs, chunk);
    for (const app of chunk) {
      const hit =
        scores.get(app.url.toLowerCase()) ??
        [...scores.entries()].find(([k]) => k.includes(app.url.split("/").pop() ?? "xxx"))?.[1];
      if (!hit) {
        console.log("  miss", app.title.slice(0, 40));
        continue;
      }
      const old = app.match_score;
      await pool.query(
        `UPDATE application
         SET match_score = $1,
             notes = COALESCE(notes,'') || $2
         WHERE id = $3`,
        [
          hit.score,
          `\nAI rescore: ${hit.score} (${hit.passed ? "pass" : "fail"}) — ${hit.reasons.join("; ")}`,
          app.id
        ]
      );
      updated += 1;
      if (!hit.passed) wouldDrop += 1;
      console.log(
        `  ${String(old).padStart(3)}→${String(hit.score).padStart(3)} ${hit.passed ? "PASS" : "FAIL"} ${app.title.slice(0, 50)} @ ${app.company_name}`
      );
    }
  }

  const dist = await pool.query(
    `
    SELECT
      COUNT(*)::int n,
      ROUND(AVG(match_score))::int avg,
      COUNT(*) FILTER (WHERE match_score >= 80)::int high,
      COUNT(*) FILTER (WHERE match_score >= 60 AND match_score < 80)::int mid,
      COUNT(*) FILTER (WHERE match_score < 60)::int low,
      COUNT(*) FILTER (WHERE match_score < $1)::int below_min
    FROM application
  `,
    [prefs.minMatchScore]
  );

  console.log(
    JSON.stringify(
      { updated, wouldDrop, minMatchScore: prefs.minMatchScore, dist: dist.rows[0] },
      null,
      2
    )
  );

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
