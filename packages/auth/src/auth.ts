import { join } from "node:path/posix";
import { createRequire } from "node:module";

import type { betterAuth } from "better-auth";

/**
 * Lazy Better Auth instance.
 *
 * The web SSR bundle used to transitively import @tsu-stack/db (and
 * therefore `pg`) via the static `import { db } from "@tsu-stack/db"`
 * at the top of this file. Nitro bundles workspace packages, and the
 * bundled `pg` came out as a stub whose `Pool` class is an empty
 * object, producing the runtime
 * `Class extends value #<Object> is not a constructor` crash.
 *
 * The fix: defer every heavyweight import — drizzleAdapter, betterAuth
 * itself, @tsu-stack/db, @tsu-stack/email, @tsu-stack/env/server/env —
 * behind a `createRequire(import.meta.url)` call inside `getAuth()`.
 * `createRequire` is a Node.js builtin that works in ESM, returns a
 * synchronous `require` function, and crucially does NOT show up in
 * the bundler's static import graph. Nitro therefore no longer pulls
 * @tsu-stack/db / pg / drizzle-orm into the web SSR build.
 *
 * The `auth` export is still a plain object (a Proxy that lazily
 * initialises on first property access), so call sites that just
 * type `auth` (or read its static surface) don't trigger any init.
 */

type AuthInstance = ReturnType<typeof betterAuth>;
let _auth: AuthInstance | undefined;
let _require: NodeRequire | undefined;
function getRequire(): NodeRequire {
  if (!_require) {
    _require = createRequire(import.meta.url);
  }
  return _require;
}

function getAuth(): AuthInstance {
  if (_auth) {
    return _auth;
  }
  const req = getRequire();
  const { drizzleAdapter } = req("@better-auth/drizzle-adapter/relations-v2") as typeof import("@better-auth/drizzle-adapter/relations-v2");
  const { passkey } = req("@better-auth/passkey") as typeof import("@better-auth/passkey");
  const { APIError, betterAuth } = req("better-auth") as typeof import("better-auth");
  const { openAPI } = req("better-auth/plugins") as typeof import("better-auth/plugins");
  const { db } = req("@tsu-stack/db") as typeof import("@tsu-stack/db");
  const schema = req("@tsu-stack/db/schema") as typeof import("@tsu-stack/db/schema");
  const { sendEmail, VerifyEmail } = req("@tsu-stack/email") as typeof import("@tsu-stack/email");
  const { ENV_SERVER } = req("@tsu-stack/env/server/env") as typeof import("@tsu-stack/env/server/env");

  _auth = betterAuth({
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
          template: VerifyEmail({ username: user.name, url })
        });
      },
      autoSignInAfterVerification: true
    },

    user: {
      additionalFields: {
        summary: {
          type: "string",
          required: false,
          defaultValue: ""
        },
        phone: {
          type: "string",
          required: false
        }
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ newEmail, url, user }) => {
          await sendEmail({
            to: newEmail,
            subject: "Verify your email address",
            template: VerifyEmail({ username: user.name, url })
          });
        }
      }
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60
      }
    },

    experimental: {
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
      if (ENV_SERVER.GITHUB_CLIENT_ID && ENV_SERVER.GITHUB_CLIENT_SECRET) {
        return {
          github: {
            clientId: ENV_SERVER.GITHUB_CLIENT_ID,
            clientSecret: ENV_SERVER.GITHUB_CLIENT_SECRET,
            scope: [
              "repo",
              "repo:status",
              "repo_deployment",
              "public_repo",
              "repo:invite",
              "security_events",
              "admin:repo_hook",
              "write:repo_hook",
              "read:repo_hook",
              "admin:org",
              "write:org",
              "read:org",
              "admin:public_key",
              "write:public_key",
              "read:public_key",
              "admin:org_hook",
              "gist",
              "notifications",
              "user",
              "read:user",
              "user:email",
              "user:follow",
              "project",
              "read:project",
              "delete_repo",
              "write:packages",
              "read:packages",
              "delete:packages",
              "admin:gpg_key",
              "write:gpg_key",
              "read:gpg_key",
              "codespace",
              "workflow",
              "read:audit_log"
            ],
            async getUserInfo({ accessToken }: { accessToken: string }) {
              const headers = {
                "User-Agent": "better-auth",
                authorization: `Bearer ${accessToken}`
              };

              const profileRes = await fetch("https://api.github.com/user", { headers });
              const profile = await profileRes.json();

              if (!profileRes.ok || !profile.id) {
                // eslint-disable-next-line no-console
                console.error("[auth] GitHub user fetch failed:", profile);
                return null;
              }

              let email = profile.email ?? null;
              let emailVerified = false;

              if (!email) {
                const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
                if (emailsRes.ok) {
                  const emails = await emailsRes.json();
                  if (Array.isArray(emails) && emails.length > 0) {
                    const primary = emails.find((e) => e.primary) ?? emails[0];
                    if (primary) {
                      email = primary.email;
                      emailVerified = primary.verified ?? false;
                    }
                  }
                }
              }

              if (!email) {
                email = `${profile.id}+${profile.login}@users.noreply.github.com`;
                emailVerified = true;
              }

              return {
                user: {
                  id: String(profile.id),
                  name: profile.name ?? profile.login ?? "",
                  email,
                  emailVerified,
                  image: profile.avatar_url
                },
                data: profile
              };
            }
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

  return _auth;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  }
}) as AuthInstance;

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
