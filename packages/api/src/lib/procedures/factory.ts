import { ORPCError, os } from "@orpc/server";

import { githubConfigRepository } from "@tsu-stack/db/repositories";

import { type OrpcContext } from "#@/lib/context/types";

const o = os.$context<OrpcContext>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      github: context.github,
      logger: context.logger,
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

const requireOwner = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const settings = await githubConfigRepository.findPublicGithubSourceSettings();
  const ownerUserId = settings?.userId ?? null;
  if (!ownerUserId || context.session.user.id !== ownerUserId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Only the GitHub owner can access this procedure"
    });
  }
  return next({
    context: {
      github: context.github,
      logger: context.logger,
      session: context.session
    }
  });
});

export const ownerProcedure = publicProcedure
  .use(requireAuth)
  .use(requireOwner)
  .errors({
    FORBIDDEN: {
      message: "Only the GitHub owner can access this procedure",
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
