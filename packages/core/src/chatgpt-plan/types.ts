import { z } from "zod";

import { CHATGPT_PLAN_ERROR_CODES } from "./constants";

export const ChatgptPlanErrorCodeSchema = z.enum(CHATGPT_PLAN_ERROR_CODES);
export type ChatgptPlanErrorCode = z.infer<typeof ChatgptPlanErrorCodeSchema>;

export class ChatgptPlanError extends Error {
  readonly code: ChatgptPlanErrorCode;

  constructor(code: ChatgptPlanErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ChatgptPlanError";
    this.code = code;
  }
}

export const ChatgptPlanStartOutputSchema = z.object({
  authorizeUrl: z.string().url(),
  expiresAt: z.coerce.date()
});
export type ChatgptPlanStartOutput = z.infer<typeof ChatgptPlanStartOutputSchema>;

export const ChatgptPlanCompleteInputSchema = z.object({
  /** The full 127.0.0.1 address the browser ended on after sign-in. */
  callbackUrl: z.string().min(1).max(4096)
});
export type ChatgptPlanCompleteInput = z.infer<typeof ChatgptPlanCompleteInputSchema>;

export const ChatgptPlanStatusSchema = z.object({
  connected: z.boolean(),
  needsReconnect: z.boolean(),
  /** Signed in but the grant lacks chatgpt.tokens.use.direct. */
  planUsageEnabled: z.boolean(),
  email: z.string().nullable(),
  planType: z.string().nullable(),
  accessExpiresAt: z.coerce.date().nullable(),
  lastErrorCode: ChatgptPlanErrorCodeSchema.nullable(),
  lastErrorAt: z.coerce.date().nullable()
});
export type ChatgptPlanStatus = z.infer<typeof ChatgptPlanStatusSchema>;

export const ChatgptPlanModelsOutputSchema = z.object({
  models: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
});
export type ChatgptPlanModelsOutput = z.infer<typeof ChatgptPlanModelsOutputSchema>;

export type ChatgptPlanCredentials = {
  clientId: string;
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  accessExpiresAt: number;
  earliestRefreshAt: number | null;
  scopes: string[];
};
