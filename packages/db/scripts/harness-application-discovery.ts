import assert from "node:assert/strict";

const dbUrl = new URL(process.env.DATABASE_URL ?? "");
assert(["localhost", "127.0.0.1", "[::1]"].includes(dbUrl.hostname), "requires a local database");

const { and, eq } = await import("drizzle-orm");
const { createDb, pool, runWithDb, applicationRepository } = await import("@tsu-stack/db");
const { application, applicationActivity, user } = await import("@tsu-stack/db/schema");
const db = createDb();
const userId = `discovery-harness-${crypto.randomUUID()}`;

try {
  await db.insert(user).values({
    id: userId,
    name: "Discovery harness",
    email: `${userId}@example.invalid`,
    username: `harness-${crypto.randomUUID().slice(0, 12)}`
  });
  await runWithDb(db, async () => {
    const input = {
      userId,
      title: "Frontend Engineer",
      companyName: "Harness",
      url: "https://example.invalid/job"
    };
    await assert.rejects(
      applicationRepository.createIfAbsentByUrl(input, {
        kind: "discovered",
        actorUserId: `missing-${crypto.randomUUID()}`,
        metadata: { via: "harness" }
      })
    );
    assert.equal(
      (await db.select().from(application).where(eq(application.userId, userId))).length,
      0,
      "a failed activity must roll back the application insert"
    );
    const activity = {
      kind: "discovered" as const,
      actorUserId: userId,
      metadata: { via: "harness" }
    };
    const results = await Promise.all([
      applicationRepository.createIfAbsentByUrl(input, activity),
      applicationRepository.createIfAbsentByUrl(input, activity)
    ]);
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(results[0].row.id, results[1].row.id);
    const timeline = await db
      .select()
      .from(applicationActivity)
      .where(
        and(
          eq(applicationActivity.userId, userId),
          eq(applicationActivity.applicationId, results[0].row.id)
        )
      );
    assert.equal(timeline.length, 1, "concurrent retries must not duplicate discovery activity");
    assert.equal(timeline[0].kind, "discovered");
    assert.equal(timeline[0].actorUserId, userId);
    assert.equal(timeline[0].applicationId, results[0].row.id);
  });
  console.debug(
    "PASS application/activity rollback, concurrent URL deduplication, and discovery activity fields"
  );
} finally {
  await db.delete(user).where(eq(user.id, userId));
  await pool.end();
}
