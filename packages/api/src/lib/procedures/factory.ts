import { ORPCError, os } from "@orpc/server";

import { isSuperAdminRole } from "@tsu-stack/core";
import { githubConfigRepository, userRepository } from "@tsu-stack/db/repositories";

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

const requireSuperAdmin = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const userId = context.session.user.id;
  let role = context.session.user.role;
  let banned = context.session.user.banned;
  if (role == null || banned == null) {
    const row = await userRepository.findById(userId);
    role = row?.role ?? null;
    banned = row?.banned ?? false;
  }
  if (banned) {
    throw new ORPCError("FORBIDDEN", { message: "This account is disabled" });
  }
  if (!isSuperAdminRole(role)) {
    throw new ORPCError("FORBIDDEN", { message: "Super admin only" });
  }
  return next({
    context: {
      session: context.session
    }
  });
});

export const superAdminProcedure = publicProcedure
  .use(requireAuth)
  .use(requireSuperAdmin)
  .errors({
    FORBIDDEN: {
      message: "Super admin only",
      status: 403
    },
    LAST_ADMIN: {
      message: "The last super admin cannot be demoted or banned",
      status: 409
    },
    CANNOT_BAN_SELF: {
      message: "You cannot ban your own account",
      status: 400
    },
    USER_NOT_FOUND: {
      message: "User not found",
      status: 404
    },
    INVITE_NOT_FOUND: {
      message: "Invite not found",
      status: 404
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
