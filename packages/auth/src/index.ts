import { join } from "node:path/posix";

import { passkey } from "@better-auth/passkey";
import "@tanstack/react-start/server-only";
import { APIError, betterAuth } from "better-auth";
//TODO: update this when the pr merged https://github.com/better-auth/better-auth/issues/6766#issuecomment-4614864597
import { drizzleAdapter } from "better-auth-drizzle-adapter";
import { openAPI } from "better-auth/plugins";

import { db } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";
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
          const existingUsers = await db.query.user.findMany({ limit: 1 });
          if (existingUsers.length > 0) {
            throw new APIError("FORBIDDEN", {
              message: "Registration is closed"
            });
          }
        }
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
  socialProviders: {
    github: {
      clientId: ENV_SERVER.GITHUB_CLIENT_ID,
      clientSecret: ENV_SERVER.GITHUB_CLIENT_SECRET
    }
  }
});

export type AuthSession = typeof auth.$Infer.Session;
