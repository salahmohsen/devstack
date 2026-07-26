import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { stripTrailingSlashes } from "@tsu-stack/core";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { appConfig } from "@/config/app.config";

function createWebCallbackUrl(redirectTo?: string): string {
  const baseUrl = stripTrailingSlashes(ENV_WEB_ISOMORPHIC.VITE_WEB_URL);

  if (typeof redirectTo === "string" && /^https?:\/\//i.test(redirectTo)) {
    try {
      const target = new URL(redirectTo);
      if (target.origin === new URL(baseUrl).origin) {
        return `${baseUrl}${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // fall through to path handling
    }
  }

  const raw = typeof redirectTo === "string" && redirectTo.length > 0 ? redirectTo : "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;

  return `${baseUrl}${path}`;
}

function createOAuthErrorCallbackUrl(redirectTo?: string): string {
  const baseUrl = stripTrailingSlashes(ENV_WEB_ISOMORPHIC.VITE_WEB_URL);
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    return `${baseUrl}/sign-in?redirect=${encodeURIComponent(redirectTo)}`;
  }
  return `${baseUrl}/sign-in`;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "This GitHub account is not linked to the portfolio owner. Sign in with the owner GitHub account (matching email).",
  REGISTRATION_CLOSED: "Registration is closed. Only the portfolio owner can sign in.",
  registration_closed: "Registration is closed. Only the portfolio owner can sign in.",
  email_not_found:
    "GitHub did not return an email address. Make sure your GitHub email is public or verified.",
  unable_to_create_user: "Could not create a session for this GitHub account.",
  unable_to_link_account: "Could not link this GitHub account to the existing admin user."
};

export function SignInForm({
  redirectTo = "/",
  oauthError,
  oauthErrorDescription,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  redirectTo?: NavigateOptions["to"];
  oauthError?: string;
  oauthErrorDescription?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Surface Better Auth OAuth callback errors (?error=…) after GitHub redirect.
  useEffect(() => {
    if (!oauthError) return;

    toast.error(
      OAUTH_ERROR_MESSAGES[oauthError] ??
        oauthErrorDescription ??
        `Sign-in failed (${oauthError.replaceAll("_", " ")}).`
    );

    void navigate({
      to: "/sign-in",
      search:
        typeof redirectTo === "string" && redirectTo.length > 0 ? { redirect: redirectTo } : {},
      replace: true
    });
  }, [oauthError, oauthErrorDescription, navigate, redirectTo]);

  const signInWithGithubMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        callbackURL: createWebCallbackUrl(redirectTo),
        errorCallbackURL: createOAuthErrorCallbackUrl(redirectTo),
        provider: "github"
      });

      if (!result.data) {
        // Surface the actual server error (status + body) so the toast
        // tells the user why sign-in failed instead of a generic
        // "GitHub sign-in failed" that hides the real cause.
        const status = result.error?.status;
        const code = result.error?.code;
        const message = result.error?.message;
        if (message) {
          throw new Error(status ? `[${status}${code ? ` ${code}` : ""}] ${message}` : message);
        }
        // No data and no error message — return the full body so the
        // user has something actionable in the toast and the dev
        // console.
        throw new Error(`GitHub sign-in failed (no response). ${JSON.stringify(result)}`);
      }

      return result.data;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      // Better Auth returns { url, redirect: true } for social OAuth. Its
      // client redirect plugin also tries window.location.href, but that can
      // race with React Query onSuccess (invalidate/refetch) and look like a
      // soft refresh of /sign-in. Navigate explicitly and skip session refetch
      // until the user returns from GitHub.
      const url = typeof data === "object" && data && "url" in data ? data.url : null;
      if (typeof url === "string" && url.length > 0) {
        toast.success("Redirecting to GitHub…");
        window.location.assign(url);
        return;
      }
      toast.error("GitHub sign-in failed (missing redirect URL).");
    }
  });

  const signInWithPasskeyMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.passkey();

      if (!result.data) {
        throw new Error(result.error?.message ?? "Passkey sign-in failed.");
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      await navigate({
        to: redirectTo
      });
      toast.success("Signed in successfully.");
    }
  });

  const isPending = signInWithGithubMutation.isPending || signInWithPasskeyMutation.isPending;

  return (
    <div className={cn("my-auto h-full w-full max-w-md space-y-5", className)} {...props}>
      <Card>
        <CardHeader className="items-center text-center">
          <Link className="mb-2 inline-flex" to="/">
            <span className="sr-only">{appConfig.site.shortName}</span>
          </Link>
          <CardTitle className="text-xl tracking-tight">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            <Button
              className="w-full justify-center gap-2 rounded-xs"
              disabled={isPending}
              onClick={() => signInWithGithubMutation.mutate()}
              type="button"
              variant="outline"
            >
              Continue with GitHub
            </Button>
            <Button
              className="w-full justify-center gap-2 rounded-xs"
              disabled={isPending}
              onClick={() => signInWithPasskeyMutation.mutate()}
              type="button"
              variant="outline"
            >
              <KeyRound className="size-4" />
              Continue with Passkey
            </Button>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-5 flex flex-wrap justify-center gap-1 px-6 text-xs leading-6 text-muted-foreground">
          By continuing, you agree to our
          <Link className="underline underline-offset-4" to="/terms-of-service">
            Terms of Service
          </Link>
          and
          <Link className="underline underline-offset-4" to="/privacy-policy">
            Privacy Policy
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
