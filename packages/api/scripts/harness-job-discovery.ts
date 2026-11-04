import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout as wait } from "node:timers/promises";

const dbUrl = new URL(process.env.DATABASE_URL ?? "");
assert(["localhost", "127.0.0.1"].includes(dbUrl.hostname), "harness requires a local database");
let requests = 0;
let mode: "retry" | "permanent" | "empty" = "retry";
const fixture = createServer((request, response) => {
  if (!request.url?.startsWith("/agent/jobs/search")) {
    response.writeHead(404).end();
    return;
  }
  requests += 1;
  response.setHeader("content-type", "application/json");
  if (mode === "permanent") {
    response.writeHead(400).end(JSON.stringify({ error: "invalid filter" }));
    return;
  }
  if (mode === "empty") {
    response.end(JSON.stringify({ data: [], meta: { total: 0, limit: 100, offset: 0 } }));
    return;
  }
  if (requests === 1) {
    response.writeHead(503).end(JSON.stringify({ error: "temporary failure" }));
    return;
  }
  response.end(
    JSON.stringify({
      data: [45_000, 2_000].map((salary, index) => ({
        public_slug: `fixture-${index}`,
        url: `https://example.com/jobs/discovery-fixture-${index}`,
        title: "React Engineer",
        company: "Fixture Employer",
        location: "Unrecognized location",
        regions: ["global"],
        countries: [],
        cities: [],
        work_mode: "remote",
        skills: ["react"],
        description: "<p>Build accessible frontend applications with React and TypeScript.</p>",
        enrichment_version: 1,
        enrichment: {
          category: "frontend",
          salary_min: salary,
          salary_currency: "EGP",
          salary_period: "month"
        }
      })),
      meta: { total: 2, limit: 100, offset: 0 }
    })
  );
});
await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const address = fixture.address();
assert(address && typeof address === "object");
process.env.FREEHIRE_API_BASE_URL = `http://127.0.0.1:${address.port}`;

const { eq } = await import("drizzle-orm");
const { userJobRepository: staging } = await import("../../../packages/db/src/index.ts");
const {
  createDb,
  runWithDb,
  jobDiscoveryRunRepository: runs,
  applicationRepository
} = await import("../../../packages/db/src/index.ts");
const { user, jobPreference, jobDiscoveryRun } =
  await import("../../../packages/db/src/schema/index.ts");
const { requestJobDiscoveryLand } =
  await import("../../../packages/api/src/lib/job-discovery/enqueue.ts");
const { startJobDiscoveryLandQueue, stopJobDiscoveryLandQueue } =
  await import("../../../apps/server/src/queues/job-discovery-land-queue.ts");
const { startJobInboxAiQueue, stopJobInboxAiQueue } =
  await import("../../../apps/server/src/queues/job-inbox-ai-queue.ts");
const db = createDb();
const userId = `discovery_harness_${crypto.randomUUID()}`;
const foreignUserId = `${userId}_other`;
const runId = `harness_${crypto.randomUUID()}`;
let retryObserved = false;
try {
  await runWithDb(db, async () => {
    await db.insert(user).values(
      [userId, foreignUserId].map((id) => ({
        id,
        name: "Discovery fixture",
        username: id,
        email: `${id}@example.invalid`
      }))
    );
    await db.insert(jobPreference).values({
      id: crypto.randomUUID(),
      userId,
      workModes: ["remote", "hybrid"],
      categories: ["frontend"],
      regions: ["global", "mena"],
      cities: ["Cairo"],
      salaryMin: 40_000,
      salaryCurrency: "EGP",
      minMatchScore: 0
    });
    startJobDiscoveryLandQueue(process.env.REDIS_URL!);
    startJobInboxAiQueue(process.env.REDIS_URL!);
    await Promise.all(
      [runId, `${runId}_duplicate`].map((id) =>
        requestJobDiscoveryLand({ userId, runId: id, trigger: "find_now" })
      )
    );
    const claimed = await runs.findActive(userId);
    assert(claimed, "concurrent requests claim one active run");
    const all = await db.select().from(jobDiscoveryRun).where(eq(jobDiscoveryRun.userId, userId));
    assert.equal(all.length, 1, "concurrent searches coalesce atomically");
    assert.equal(
      await runs.find(foreignUserId, claimed.runId),
      null,
      "other tenant cannot read the run"
    );
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const current = await runs.find(userId, claimed.runId);
      if (current?.stage === "retrying") retryObserved = true;
      if (current?.stage === "failed") throw new Error(current.reason ?? "worker failed");
      if (current?.stage === "completed") {
        assert(retryObserved, "transient fetch failure is visible as retrying");
        assert.equal(requests, 2, "queue retries the failed fetch exactly once");
        assert.equal(
          Object.values(current.candidates).length,
          1,
          "monthly EGP floor removes the low-paying listing"
        );
        assert.equal(
          Object.values(current.candidates)[0],
          "heuristic",
          "category and structured region admit the React title"
        );
        assert.equal(
          await applicationRepository.countByUserIdAndTrackingStatus(userId, "inbox"),
          1,
          "one actual inbox row is created"
        );
        const reservedAgain = await runs.reserveCandidate(
          userId,
          claimed.runId,
          Object.keys(current.candidates)[0]!
        );
        assert.equal(reservedAgain, false, "completed candidate cannot be reserved twice");
        console.log(
          "PASS: real Redis retry, atomic coalescing, tenant isolation, structured geography, monthly EGP floor, category gate, persisted completion and one inbox insert"
        );
        const prior = await staging.findById(Object.keys(current.candidates)[0]!);
        assert(prior);
        await staging.upsertMany(userId, [
          {
            ...prior,
            id: crypto.randomUUID(),
            freehireSlug: "stale-unseen-fixture",
            listingUrl: "https://example.com/jobs/stale-unseen-fixture"
          }
        ]);
        for (const nextMode of ["permanent", "empty"] as const) {
          mode = nextMode;
          const before: number = requests;
          const nextId = `${runId}_${nextMode}`;
          await requestJobDiscoveryLand({ userId, runId: nextId, trigger: "find_now" });
          let settled = false;
          for (let n = 0; n < 100; n += 1) {
            const next = await runs.find(userId, nextId);
            if (next?.stage === "failed" || next?.stage === "completed") {
              assert.equal(
                next.stage,
                nextMode === "permanent" ? "failed" : "completed",
                "error and empty are distinct terminal states"
              );
              assert.equal(
                requests - before,
                1,
                "permanent failures and empty results do not retry"
              );
              settled = true;
              break;
            }
            await wait(100);
          }
          assert(settled, `${nextMode} run reaches terminal state`);
        }
        const failedCandidateRun = `${runId}_screening_failure`;
        await runs.claim(userId, failedCandidateRun, new Date());
        assert(await runs.reserveCandidate(userId, failedCandidateRun, "failed-candidate"));
        await runs.update(userId, failedCandidateRun, { landFinished: true, stage: "scoring" });
        await runs.finishCandidate(userId, failedCandidateRun, "failed-candidate", "failed");
        assert.equal(
          (await runs.find(userId, failedCandidateRun))?.stage,
          "failed",
          "screening failure cannot masquerade as an empty success"
        );
        const staleRun = `${runId}_stale`;
        await runs.claim(userId, staleRun, new Date(Date.now() - 60 * 60_000));
        await db
          .update(jobDiscoveryRun)
          .set({ updatedAt: new Date(Date.now() - 60 * 60_000) })
          .where(eq(jobDiscoveryRun.runId, staleRun));
        await runs.expireStale(userId);
        assert.equal(
          (await runs.find(userId, staleRun))?.stage,
          "failed",
          "worker crash cannot block future searches forever"
        );
        mode = "empty";
        const scheduledId = `${runId}_scheduled`;
        await requestJobDiscoveryLand(
          { userId, runId: scheduledId, trigger: "cron" },
          { delayMs: 60_000 }
        );
        const before: number = Date.now();
        await requestJobDiscoveryLand({ userId, runId: `${runId}_manual`, trigger: "find_now" });
        for (let n = 0; n < 100; n += 1) {
          const accelerated = await runs.find(userId, scheduledId);
          if (accelerated?.stage === "completed") {
            assert(Date.now() - before < 10_000, "manual find expedites scheduled run");
            const manual = await runs.find(userId, `${runId}_manual`);
            assert.equal(manual, null, "manual find reuses the scheduled run");
            console.log(
              "PASS: permanent errors fail immediately, empty results complete, and manual find expedites the scheduled run"
            );
            return;
          }
          await wait(100);
        }
        throw new Error("scheduled run was not accelerated");
      }
      await wait(100);
    }
    throw new Error("Discovery worker did not reach a terminal state in 30s");
  });
} finally {
  await stopJobDiscoveryLandQueue();
  await stopJobInboxAiQueue();
  await runWithDb(db, async () => {
    await db.delete(user).where(eq(user.id, userId));
    await db.delete(user).where(eq(user.id, foreignUserId));
  });
  fixture.close();
}
process.exit(0);
