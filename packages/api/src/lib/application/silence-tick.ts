import { silencePhase } from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  mailMessageRepository
} from "@tsu-stack/db";

import { emitAppNotification } from "#@/lib/notification/emit-app-notification";

const BATCH = 80;

export async function runSilenceTick(
  now = new Date()
): Promise<{ checked: number; nudged: number; suggested: number }> {
  const rows = await applicationRepository.listOpenTracked(BATCH);
  let nudged = 0;
  let suggested = 0;

  for (const app of rows) {
    const [mails, activity] = await Promise.all([
      mailMessageRepository.listByApplicationId(app.id, app.userId, 1),
      applicationActivityRepository.listByApplicationId(app.id, app.userId, {
        limit: 50,
        order: "desc"
      })
    ]);
    const lastLinkedMailAt = mails[0]?.receivedAt ?? null;
    const lastSilenceNudgeAt =
      activity.find((row) => row.kind === "silence_nudged")?.createdAt ?? null;
    const lastGhostSuggestAt =
      activity.find((row) => row.kind === "ghosted_suggested")?.createdAt ?? null;
    const phase = silencePhase({
      now,
      stageChangedAt: app.stageChangedAt,
      lastLinkedMailAt,
      lastSilenceNudgeAt,
      lastGhostSuggestAt
    });
    if (phase === "quiet") continue;
    const href = `/dashboard/tracked-jobs?id=${encodeURIComponent(app.id)}`;
    if (phase === "nudge7") {
      await applicationActivityRepository.append({
        userId: app.userId,
        applicationId: app.id,
        kind: "silence_nudged"
      });
      await emitAppNotification({
        userId: app.userId,
        kind: "application.silence_nudge",
        title: "This job has been quiet",
        body: "No stage change and no linked mail for 7 days.",
        href,
        applicationId: app.id
      });
      nudged += 1;
    } else if (phase === "suggestGhost14") {
      await applicationActivityRepository.append({
        userId: app.userId,
        applicationId: app.id,
        kind: "ghosted_suggested"
      });
      await emitAppNotification({
        userId: app.userId,
        kind: "application.ghosted_suggest",
        title: "Still quiet after 14 days",
        body: "You can mark this as ghosted. We will not do it for you.",
        href,
        applicationId: app.id
      });
      suggested += 1;
    }
  }

  return { checked: rows.length, nudged, suggested };
}
