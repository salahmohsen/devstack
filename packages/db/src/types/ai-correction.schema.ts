import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import { type aiCorrection } from "../schema/ai-correction.schema.ts";

export type AiCorrectionSchemaSelect = InferSelectModel<typeof aiCorrection>;
export type AiCorrectionSchemaInsert = InferInsertModel<typeof aiCorrection>;
