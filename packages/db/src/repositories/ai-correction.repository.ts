import { desc, eq, sql, type InferSelectModel } from "drizzle-orm";

import { getDb } from "../index.ts";
import { aiCorrection } from "../schema/ai-correction.schema.ts";
import { OPENAI_EMBEDDING_DIMENSIONS } from "../schema/vector-column.ts";

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
  mastraTraceId?: string | null;
  mastraRunId?: string | null;
  embedding?: number[] | null;
  note?: string | null;
};

function isValidEmbedding(emb: number[] | null | undefined): emb is number[] {
  if (!emb || emb.length !== OPENAI_EMBEDDING_DIMENSIONS) return false;
  return emb.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Safe pgvector literal — only finite numbers. */
function toVectorLiteral(emb: number[]): string {
  return `[${emb.join(",")}]`;
}

export const aiCorrectionRepository = {
  async create(input: CreateAiCorrectionData): Promise<AiCorrectionEntity> {
    const emb = isValidEmbedding(input.embedding) ? input.embedding : null;
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
        mastraTraceId: input.mastraTraceId ?? null,
        mastraRunId: input.mastraRunId ?? null,
        embedding: emb,
        embeddingVec: emb,
        note: input.note ?? null
      })
      .returning();
    return row!;
  },

  /** Newest first — lexical candidate pool. */
  async findRecentByUserId(userId: string, limit = 5): Promise<AiCorrectionEntity[]> {
    return getDb()
      .select()
      .from(aiCorrection)
      .where(eq(aiCorrection.userId, userId))
      .orderBy(desc(aiCorrection.createdAt))
      .limit(limit);
  },

  /**
   * Nearest corrections by cosine distance (pgvector `<=>`).
   * Returns [] when embedding invalid or extension/query fails (caller falls back).
   */
  async findSimilarByEmbedding(
    userId: string,
    embedding: number[],
    limit = 5
  ): Promise<AiCorrectionEntity[]> {
    if (!isValidEmbedding(embedding)) return [];

    try {
      const literal = toVectorLiteral(embedding);
      // sql.raw is safe: only digits, commas, brackets from validated floats.
      const rows = await getDb()
        .select()
        .from(aiCorrection)
        .where(sql`${aiCorrection.userId} = ${userId} AND ${aiCorrection.embeddingVec} IS NOT NULL`)
        .orderBy(sql`${aiCorrection.embeddingVec} <=> ${sql.raw(`'${literal}'::vector`)}`)
        .limit(limit);
      return rows;
    } catch (error) {
      console.debug("[ai_correction] findSimilarByEmbedding failed; using lexical fallback", {
        message: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
};
