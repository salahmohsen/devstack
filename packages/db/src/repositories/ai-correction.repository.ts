import { desc, eq, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { aiCorrection } from "../schema/ai-correction.schema.ts";

export type AiCorrectionEntity = InferSelectModel<typeof aiCorrection>;

export type CreateAiCorrectionData = {
  id: string;
  userId: string;
  messageId?: string | null;
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  preview?: string;
  predictedSystemLabels?: string[];
  correctedSystemLabels?: string[];
  predictedStage?: string | null;
  correctedStage?: string | null;
  crmApplyId?: string | null;
  note?: string | null;
};

export const aiCorrectionRepository = {
  async create(input: CreateAiCorrectionData): Promise<AiCorrectionEntity> {
    const [row] = await getDb()
      .insert(aiCorrection)
      .values({
        id: input.id,
        userId: input.userId,
        messageId: input.messageId ?? null,
        fromName: input.fromName ?? "",
        fromEmail: input.fromEmail ?? "",
        subject: input.subject ?? "",
        preview: input.preview ?? "",
        predictedSystemLabels: input.predictedSystemLabels ?? [],
        correctedSystemLabels: input.correctedSystemLabels ?? [],
        predictedStage: input.predictedStage ?? null,
        correctedStage: input.correctedStage ?? null,
        crmApplyId: input.crmApplyId ?? null,
        note: input.note ?? null
      })
      .returning();
    return row!;
  },

  /** Newest first — for few-shot load. */
  async findRecentByUserId(userId: string, limit = 5): Promise<AiCorrectionEntity[]> {
    return getDb()
      .select()
      .from(aiCorrection)
      .where(eq(aiCorrection.userId, userId))
      .orderBy(desc(aiCorrection.createdAt))
      .limit(limit);
  }
};
