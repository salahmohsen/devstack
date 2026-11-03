import { z } from "zod";

import {
  ChatgptPlanCompleteInputSchema,
  ChatgptPlanError,
  ChatgptPlanModelsOutputSchema,
  ChatgptPlanStartOutputSchema,
  ChatgptPlanStatusSchema
} from "@tsu-stack/core";

import { protectedProcedure } from "#@/lib/procedures/factory";
import {
  completeChatgptPlanSignIn,
  disconnectChatgptPlan,
  getChatgptPlanStatus,
  listChatgptPlanModels,
  startChatgptPlanSignIn
} from "#@/lib/settings/chatgpt-plan";

const chatgptPlanProcedure = protectedProcedure.errors({
  CHATGPT_PLAN_RECONNECT: { message: "Reconnect ChatGPT in Settings, AI.", status: 401 },
  CHATGPT_PLAN_LIMIT: { message: "ChatGPT plan limit reached. Try again later.", status: 429 },
  CHATGPT_PLAN_UNAVAILABLE: {
    message: "ChatGPT plan usage is temporarily unavailable.",
    status: 503
  },
  CHATGPT_PLAN_NOT_ELIGIBLE: {
    message: "This ChatGPT account cannot use plan usage in apps.",
    status: 403
  },
  CHATGPT_PLAN_UNSUPPORTED: {
    message: "ChatGPT plan usage does not support this request.",
    status: 400
  },
  CHATGPT_PLAN_SIGN_IN_FAILED: {
    message: "ChatGPT sign-in could not be completed.",
    status: 400,
    data: z.object({ reason: z.string() })
  }
});

export const chatgptPlanRouter = {
  status: chatgptPlanProcedure
    .route({ description: "ChatGPT plan connection status (no tokens)", method: "GET" })
    .output(ChatgptPlanStatusSchema)
    .handler(({ context }) => getChatgptPlanStatus(context.session.user.id)),

  start: chatgptPlanProcedure
    .route({
      description: "Begin ChatGPT sign-in: returns the authorize URL to open on your own machine",
      method: "POST"
    })
    .output(ChatgptPlanStartOutputSchema)
    .handler(({ context }) => startChatgptPlanSignIn(context.session.user.id)),

  complete: chatgptPlanProcedure
    .route({
      description: "Finish ChatGPT sign-in with the pasted 127.0.0.1 address",
      method: "POST"
    })
    .input(ChatgptPlanCompleteInputSchema)
    .output(ChatgptPlanStatusSchema)
    .handler(async ({ input, context, errors }) => {
      const result = await completeChatgptPlanSignIn(context.session.user.id, input.callbackUrl);
      if (!result.ok) {
        throw errors.CHATGPT_PLAN_SIGN_IN_FAILED({ data: { reason: result.message } });
      }
      return result.status;
    }),

  models: chatgptPlanProcedure
    .route({ description: "Models available to the connected ChatGPT account", method: "GET" })
    .output(ChatgptPlanModelsOutputSchema)
    .handler(async ({ context, errors }) => {
      try {
        return await listChatgptPlanModels(context.session.user.id);
      } catch (error) {
        if (error instanceof ChatgptPlanError) throw errors[error.code]();
        throw error;
      }
    }),

  disconnect: chatgptPlanProcedure
    .route({ description: "Revoke at OpenAI and delete stored ChatGPT tokens", method: "POST" })
    .output(z.object({ revoked: z.boolean() }))
    .handler(({ context }) => disconnectChatgptPlan(context.session.user.id))
};
