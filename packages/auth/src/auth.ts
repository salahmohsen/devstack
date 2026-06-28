import { join } from "node:path/posix";

import { passkey } from "@better-auth/passkey";
import { APIError, betterAuth } from "better-auth";
//TODO: update this when the pr merged https://github.com/better-auth/better-auth/issues/6766#issuecomment-4614864597
import { drizzleAdapter } from "better-auth-drizzle-adapter";
import { openAPI } from "better-auth/plugins";

import { db } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";
import { sendEmail, VerifyEmail } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

export const auth = betterAuth({
  baseURL: new URL(ENV_SERVER.VITE_SERVER_URL).origin,
  basePath: join(new URL(ENV_SERVER.VITE_SERVER_URL).pathname, "auth"),
  trustedOrigins: [new URL(ENV_SERVER.VITE_WEB_URL).origin],
  secret: ENV_SERVER.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          // Single-user portfolio: only allow the first-ever user to
          // be created (via email/password or GitHub). Any subsequent
          // `user.create` — which Better Auth also runs at the end
          // of a social sign-in for a new account — is rejected.
          // The error is surfaced to the client with code
          // `REGISTRATION_CLOSED` so the toast can render a real
          // message instead of the generic fallback.
          const existingUsers = await db.query.user.findMany({ limit: 1 });
          if (existingUsers.length > 0) {
            throw new APIError("FORBIDDEN", {
              code: "REGISTRATION_CLOSED",
              message: "Registration is closed. Only the portfolio owner can sign in."
            });
          }
        }
      }
    }
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        template: VerifyEmail({ username: user.name, url: url })
      });
    },
    autoSignInAfterVerification: true
  },

  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ newEmail, url, user }) => {
        await sendEmail({
          to: newEmail,
          subject: "Verify your email address",
          template: VerifyEmail({ username: user.name, url: url })
        });
      }
    }
  },

  // https://www.better-auth.com/docs/concepts/session-management#session-caching
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },

  experimental: {
    // https://www.better-auth.com/docs/adapters/drizzle#joins-experimental
    joins: true
  },

  plugins: [
    openAPI({
      theme: "deepSpace"
    }),
    passkey()
  ],

  telemetry: {
    enabled: false
  },
  socialProviders: (() => {
    // GITHUB_CLIENT_ID/SECRET are runtimeRequired (optional at build, required
    // at runtime). At build we accept an empty provider so the bundle can be
    // produced without secrets present; at runtime we throw so misconfiguration
    // fails fast instead of silently breaking OAuth.
    if (ENV_SERVER.GITHUB_CLIENT_ID && ENV_SERVER.GITHUB_CLIENT_SECRET) {
      return {
        github: {
          clientId: ENV_SERVER.GITHUB_CLIENT_ID,
          clientSecret: ENV_SERVER.GITHUB_CLIENT_SECRET
        }
      };
    }
    if (!ENV_SERVER.IS_BUILD) {
      throw new Error(
        "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required at runtime. " +
          "Set both in the server environment."
      );
    }
    return {};
  })()
});

export type AuthSession = typeof auth.$Infer.Session;
