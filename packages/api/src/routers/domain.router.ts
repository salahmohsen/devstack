import { randomBytes, randomUUID } from "node:crypto";
import { promises as dns } from "node:dns";

import {
  customDomainVerificationRecordName,
  CustomDomainOutputSchema,
  DeleteResponseSchema,
  normalizeHostname,
  parseHostname,
  PublicPortfolioContextOutputSchema,
  ResolvePublicPortfolioInputSchema,
  SetCustomDomainInputSchema
} from "@tsu-stack/core";
import { userCustomDomainRepository, userRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { protectedProcedure, publicProcedure } from "#@/lib/procedures/factory";
import { resolvePublicPortfolioContext } from "#@/lib/public-portfolio/resolve-context";

function primaryAppHostname(): string {
  try {
    return normalizeHostname(new URL(ENV_SERVER.VITE_WEB_URL).host);
  } catch {
    return normalizeHostname(ENV_SERVER.VITE_WEB_URL);
  }
}

function toDomainOutput(
  row: NonNullable<Awaited<ReturnType<typeof userCustomDomainRepository.findByUserId>>>
) {
  const verificationRecordName = customDomainVerificationRecordName(row.hostname);
  return CustomDomainOutputSchema.parse({
    ...row,
    verificationRecordName,
    verificationRecordValue: row.verificationToken
  });
}

function generateVerificationToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Read TXT values for a name. Strips surrounding quotes DNS libraries may keep.
 */
async function lookupTxtValues(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.flatMap((chunks) => {
      const joined = chunks.join("");
      return [joined, joined.replace(/^"|"$/g, "")];
    });
  } catch {
    return [];
  }
}

export const domainRouter = {
  get: protectedProcedure
    .route({
      description: "Get the current user's custom domain (if any)",
      method: "GET"
    })
    .output(CustomDomainOutputSchema.nullable())
    .handler(async ({ context }) => {
      const row = await userCustomDomainRepository.findByUserId(context.session.user.id);
      return row ? toDomainOutput(row) : null;
    }),

  set: protectedProcedure
    .route({
      description: "Set or replace the current user's custom domain (resets to pending)",
      method: "POST"
    })
    .input(SetCustomDomainInputSchema)
    .output(CustomDomainOutputSchema)
    .errors({
      HOSTNAME_INVALID: {
        message: "Invalid hostname. Use a domain like portfolio.example.com (no scheme or port).",
        status: 400
      },
      HOSTNAME_PRIMARY_APP: {
        message: "You cannot claim the primary app hostname as a custom domain.",
        status: 400
      },
      HOSTNAME_TAKEN: {
        message: "That domain is already claimed by another user.",
        status: 409
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const parsed = parseHostname(input.hostname);
      if (!parsed.success) {
        throw errors.HOSTNAME_INVALID();
      }
      const hostname = parsed.data;

      if (hostname === primaryAppHostname()) {
        throw errors.HOSTNAME_PRIMARY_APP();
      }

      const existingOwner = await userCustomDomainRepository.findByHostname(hostname);
      if (existingOwner && existingOwner.userId !== userId) {
        throw errors.HOSTNAME_TAKEN();
      }

      const row = await userCustomDomainRepository.upsertForUser({
        id: randomUUID(),
        userId,
        hostname,
        verificationToken: generateVerificationToken()
      });

      return toDomainOutput(row);
    }),

  verify: protectedProcedure
    .route({
      description:
        "Verify DNS ownership via TXT at `_career-verify.{hostname}` matching verificationToken",
      method: "POST"
    })
    .output(CustomDomainOutputSchema)
    .errors({
      DOMAIN_NOT_SET: {
        message: "No custom domain configured. Set a domain first.",
        status: 404
      },
      DNS_NOT_VERIFIED: {
        message:
          "TXT record not found. Add `_career-verify.{hostname}` with your verification token and try again.",
        status: 400
      }
    })
    .handler(async ({ context, errors }) => {
      const userId = context.session.user.id;
      const current = await userCustomDomainRepository.findByUserId(userId);
      if (!current) {
        throw errors.DOMAIN_NOT_SET();
      }

      const recordName = customDomainVerificationRecordName(current.hostname);
      const txtValues = await lookupTxtValues(recordName);
      const token = current.verificationToken;
      const matched = txtValues.some((value) => value.trim() === token);

      if (!matched) {
        await userCustomDomainRepository.markFailed(userId);
        throw errors.DNS_NOT_VERIFIED();
      }

      const verified = await userCustomDomainRepository.markVerified(userId);
      if (!verified) {
        throw errors.DOMAIN_NOT_SET();
      }
      return toDomainOutput(verified);
    }),

  remove: protectedProcedure
    .route({
      description: "Remove the current user's custom domain mapping",
      method: "DELETE"
    })
    .output(DeleteResponseSchema)
    .errors({
      DOMAIN_NOT_SET: {
        message: "No custom domain configured",
        status: 404
      }
    })
    .handler(async ({ context, errors }) => {
      const removed = await userCustomDomainRepository.remove(context.session.user.id);
      if (!removed) {
        throw errors.DOMAIN_NOT_SET();
      }
      return { success: true };
    }),

  /**
   * Resolve public portfolio context from Host and/or path profileName.
   * Used by the web root loader for custom-domain Host routing.
   */
  resolvePublic: publicProcedure
    .route({
      description:
        "Resolve public portfolio identity from Host (verified custom domain) and/or profileName path",
      method: "GET"
    })
    .input(ResolvePublicPortfolioInputSchema.optional())
    .output(PublicPortfolioContextOutputSchema.nullable())
    .handler(async ({ input, context }) => {
      const host = input?.host ?? context.host ?? null;
      const pathProfileName = input?.profileName ?? null;

      const resolved = await resolvePublicPortfolioContext({
        host,
        pathProfileName
      });

      // Ensure profile still exists (defensive — resolver already checks).
      if (resolved) {
        const user = await userRepository.findById(resolved.userId);
        if (!user) return null;
      }

      return resolved;
    })
};
