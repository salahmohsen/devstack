import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { passkey } from "@better-auth/passkey";
import { APIError, betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { openAPI } from "better-auth/plugins";

import { db, inviteRepository, userRepository } from "@tsu-stack/db";
import * as schema from "@tsu-stack/db/schema";
import { sendEmail, VerifyEmail } from "@tsu-stack/email";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { getApiBasePath, getSharedCookieDomain, joinApiPath } from "@tsu-stack/env/utils/url";

import {
  INVITE_COOKIE_NAME,
  readInviteCodeFromCookieHeader,
  serializeInviteClearCookie
} from "./invite-cookie";
import { resolveUniqueProfileName } from "./profile-name";

const webOrigin = new URL(ENV_SERVER.VITE_WEB_URL).origin;
const sharedCookieDomain = getSharedCookieDomain(
  ENV_SERVER.VITE_WEB_URL,
  ENV_SERVER.VITE_SERVER_URL
);

type AuthEndpointContext = {
  body?: unknown;
  headers?: Headers | null;
  getCookie?: (name: string) => string | null;
  path?: string;
  setCookie?: (name: string, value: string, options?: Record<string, unknown>) => void;
  context?: {
    responseHeaders?: Headers;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(source: unknown, key: string): string | null {
  if (!isRecord(source)) return null;
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Invite code sources (never a user column):
 * 1. Email sign-up body field `inviteCode` (not in additionalFields → not persisted)
 * 2. Short-lived `tsu_invite_code` cookie (OAuth preflight)
 * 3. OAuth state `additionalData.inviteCode` via getOAuthState()
 */
async function extractInviteCode(ctx: AuthEndpointContext | null): Promise<string | null> {
  if (!ctx) return null;

  const fromBody = readStringField(ctx.body, "inviteCode");
  if (fromBody) return fromBody;

  if (typeof ctx.getCookie === "function") {
    const fromGetCookie = ctx.getCookie(INVITE_COOKIE_NAME);
    if (fromGetCookie?.trim()) return fromGetCookie.trim();
  }

  const fromHeader = readInviteCodeFromCookieHeader(ctx.headers?.get?.("cookie") ?? null);
  if (fromHeader) return fromHeader;

  try {
    const oauthState = await getOAuthState();
    const fromState = readStringField(oauthState, "inviteCode");
    if (fromState) return fromState;
  } catch {
    // Outside OAuth callback request — ignore.
  }

  return null;
}

function clearInviteCookie(ctx: AuthEndpointContext | null): void {
  if (!ctx) return;
  if (typeof ctx.setCookie === "function") {
    ctx.setCookie(INVITE_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      ...(sharedCookieDomain ? { domain: sharedCookieDomain } : {}),
      secure: !ENV_SERVER.VITE_SERVER_URL.includes("localhost")
    });
    return;
  }

  // Fallback: append Set-Cookie on response headers if available.
  const clear = serializeInviteClearCookie({
    domain: sharedCookieDomain,
    secure: !ENV_SERVER.VITE_SERVER_URL.includes("localhost")
  });
  const headers = ctx.context?.responseHeaders;
  if (headers && typeof headers.append === "function") {
    headers.append("Set-Cookie", clear);
  }
}

export const auth = betterAuth({
  baseURL: new URL(ENV_SERVER.VITE_SERVER_URL).origin,
  // Root deploy (`https://api.example.com`) → `/auth`
  // Legacy path deploy (`…/server`) → `/server/auth`
  basePath: joinApiPath(getApiBasePath(ENV_SERVER.VITE_SERVER_URL), "auth"),
  trustedOrigins: [webOrigin],
  secret: ENV_SERVER.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),

  databaseHooks: {
    user: {
      create: {
        before: async (userData, ctx) => {
          const isBootstrap = (await userRepository.countUsers()) === 0;

          if (!isBootstrap) {
            const inviteCode = await extractInviteCode(ctx as AuthEndpointContext | null);
            if (!inviteCode) {
              throw new APIError("FORBIDDEN", {
                code: "INVITE_REQUIRED",
                message: "An invite code is required to register."
              });
            }

            const invite = await inviteRepository.findValidByCode(inviteCode);
            if (!invite) {
              throw new APIError("FORBIDDEN", {
                code: "INVITE_INVALID",
                message: "This invite code is invalid or has already been used."
              });
            }
          }

          let profileName: string;
          try {
            profileName = await resolveUniqueProfileName({
              profileName: readStringField(userData, "profileName"),
              name: typeof userData.name === "string" ? userData.name : null,
              email: typeof userData.email === "string" ? userData.email : null
            });
          } catch (error) {
            const code =
              isRecord(error) && typeof error.code === "string"
                ? error.code
                : "PROFILE_NAME_INVALID";
            const message = error instanceof Error ? error.message : "Invalid profile name";
            if (code === "PROFILE_NAME_TAKEN") {
              throw new APIError("CONFLICT", { code, message });
            }
            // Zod issues from parseProfileName
            if (isRecord(error) && Array.isArray(error.issues)) {
              throw new APIError("BAD_REQUEST", {
                code: "PROFILE_NAME_INVALID",
                message: "Invalid profile name. Use 3–30 lowercase letters, numbers, and hyphens."
              });
            }
            throw new APIError("BAD_REQUEST", {
              code: "PROFILE_NAME_INVALID",
              message
            });
          }

          // Drop any accidental inviteCode if a client put it on user payload.
          const { inviteCode: _drop, ...rest } = userData as typeof userData & {
            inviteCode?: unknown;
          };

          return {
            data: {
              ...rest,
              profileName
            }
          };
        },
        after: async (createdUser, ctx) => {
          const endpointCtx = ctx as AuthEndpointContext | null;
          // Bootstrap: only one user exists after create — no invite to consume.
          if ((await userRepository.countUsers()) <= 1) {
            clearInviteCookie(endpointCtx);
            return;
          }

          const inviteCode = await extractInviteCode(endpointCtx);
          if (!inviteCode) {
            // Fail closed: user was created without a recoverable invite.
            await userRepository.deleteById(createdUser.id);
            throw new APIError("FORBIDDEN", {
              code: "INVITE_REQUIRED",
              message: "An invite code is required to register."
            });
          }

          const invite = await inviteRepository.findValidByCode(inviteCode);
          if (!invite) {
            await userRepository.deleteById(createdUser.id);
            throw new APIError("FORBIDDEN", {
              code: "INVITE_INVALID",
              message: "This invite code is invalid or has already been used."
            });
          }

          const marked = await inviteRepository.markUsed(invite.id, createdUser.id);
          if (!marked) {
            await userRepository.deleteById(createdUser.id);
            throw new APIError("FORBIDDEN", {
              code: "INVITE_INVALID",
              message: "This invite code is invalid or has already been used."
            });
          }

          clearInviteCookie(endpointCtx);
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
    additionalFields: {
      summary: {
        type: "string",
        required: false,
        defaultValue: ""
      },
      phone: {
        type: "string",
        required: false
      },
      // Hand-owned field historically; keep it in additionalFields so auth:generate
      // does not wipe the column on regenerate. Not user-input at sign-up.
      onboardingCompletedAt: {
        type: "date",
        required: false,
        input: false
      },
      profileName: {
        type: "string",
        required: false,
        unique: true,
        input: true
      }
    },
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

  // Link GitHub onto the existing admin row when the GitHub primary email
  // matches. Without this, a first-time GitHub sign-in for an email/password
  // admin tries to create a second user and hits invite gates.
  account: {
    accountLinking: {
      enabled: true,
      // Google (login + Gmail connect) and GitHub (portfolio) may link by email.
      trustedProviders: ["github", "google"],
      // Portfolio admin may have been seeded / signed up before verifying
      // email; still allow GitHub/Google to attach when emails match.
      requireLocalEmailVerified: false
    }
  },

  // https://www.better-auth.com/docs/concepts/session-management#session-caching
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },

  // Web (salahmohsen.com) and API (api.salahmohsen.com) are different hosts.
  // OAuth Set-Cookie is issued by the API; the web SSR `$getUser` guard
  // only sees the session if Domain is the shared parent. Localhost keeps
  // host-only cookies (sharedCookieDomain is undefined).
  // https://www.better-auth.com/docs/concepts/cookies#cross-subdomain-cookies
  ...(sharedCookieDomain
    ? {
        advanced: {
          crossSubDomainCookies: {
            enabled: true,
            domain: sharedCookieDomain
          }
        }
      }
    : {}),

  experimental: {
    // https://www.better-auth.com/docs/adapters/drizzle#joins-experimental
    joins: true
  },

  plugins: [
    openAPI({
      theme: "deepSpace"
    }),
    passkey({
      // WebAuthn rpID must match the browser host (no port). Local 127.0.0.1 → localhost.
      rpID: (() => {
        const host = new URL(ENV_SERVER.VITE_WEB_URL).hostname;
        return host === "127.0.0.1" ? "localhost" : host;
      })(),
      rpName: "Personal Hub"
    })
  ],

  telemetry: {
    enabled: false
  },

  // OAuth failures (account not linked, invite required, etc.) should
  // land on the web app, not the API host's bare /error page.
  onAPIError: {
    errorURL: `${webOrigin}/sign-in`
  },

  socialProviders: (() => {
    // GITHUB_CLIENT_ID/SECRET are runtimeRequired (optional at build, required
    // at runtime). Google is optional until Settings → Connections is used.
    // At build we accept missing secrets so the bundle can be produced without
    // them present.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers: Record<string, any> = {};

    if (ENV_SERVER.GITHUB_CLIENT_ID && ENV_SERVER.GITHUB_CLIENT_SECRET) {
      providers.github = {
        clientId: ENV_SERVER.GITHUB_CLIENT_ID,
        clientSecret: ENV_SERVER.GITHUB_CLIENT_SECRET,
        // Request every available OAuth scope (per
        // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
        // so the access token can read private repositories and any
        // other resource the app may need. GitHub returns a
        // normalized list on the stored token, so requesting
        // overlapping scopes (e.g. `user` and `user:email`) is
        // safe — only the broader scope is kept. Order mirrors the
        // docs for easy diffing when GitHub adds a new scope.
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
                const primary = emails.find((e: { primary?: boolean }) => e.primary) ?? emails[0];
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
      };
    } else if (!ENV_SERVER.IS_BUILD) {
      throw new Error(
        "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required at runtime. " +
          "Set both in the server environment."
      );
    }

    // Google: basic OIDC for login; Settings → Connections requests Gmail scopes
    // via authClient.linkSocial({ scopes: GMAIL_CONNECT_SCOPES }).
    if (ENV_SERVER.GOOGLE_CLIENT_ID && ENV_SERVER.GOOGLE_CLIENT_SECRET) {
      providers.google = {
        clientId: ENV_SERVER.GOOGLE_CLIENT_ID,
        clientSecret: ENV_SERVER.GOOGLE_CLIENT_SECRET,
        // Login/register only — not Gmail. Mail scopes are requested at connect time.
        scope: ["openid", "email", "profile"],
        accessType: "offline",
        prompt: "select_account consent"
      };
    }

    return providers;
  })()
});

export type AuthSession = typeof auth.$Infer.Session;
