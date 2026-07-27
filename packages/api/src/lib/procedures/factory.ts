import { ORPCError, os } from "@orpc/server";

import { githubConfigRepository } from "@tsu-stack/db/repositories";

import { type OrpcContext } from "#@/lib/context/types";

const o = os.$context<OrpcContext>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  // Merge-only delta: keep agentWorker / mediaBucket from the root context.
  return next({
    context: {
      session: context.session
    }
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth).route({
  spec: (spec) => {
    return {
      ...spec,
      security: [{ authCookie: [] }]
    };
  }
});

/**
 * Session user must have linked GitHub (config and/or OAuth). Used for private
 * GitHub RPCs — each user is the owner of their own GitHub data (multi-tenant).
 */
const requireOwner = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const userId = context.session.user.id;
  const settings = await githubConfigRepository.findByUserId(userId);
  const hasSource = context.github.source.isConfigured || Boolean(settings?.githubUsername);
  if (!hasSource) {
    throw new ORPCError("FORBIDDEN", {
      message: "Link a GitHub account to access private GitHub data"
    });
  }
  return next({
    context: {
      session: context.session
    }
  });
});

export const ownerProcedure = publicProcedure
  .use(requireAuth)
  .use(requireOwner)
  .errors({
    FORBIDDEN: {
      message: "Link a GitHub account to access this procedure",
      status: 403
    }
  })
  .route({
    spec: (spec) => {
      return {
        ...spec,
        security: [{ authCookie: [] }]
      };
    }
  });
