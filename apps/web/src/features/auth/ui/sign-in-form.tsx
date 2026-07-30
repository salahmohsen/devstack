import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { FaGithub } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { stripTrailingSlashes } from "@tsu-stack/core";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { FieldGroup, FieldSeparator } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

type SocialProvider = "google" | "github";

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
    "This account is not linked to an existing user. Sign in with an already registered method, or use the email that matches your hub profile.",
  REGISTRATION_CLOSED:
    "Registration requires a valid invite. Ask an existing user for an invite code.",
  registration_closed:
    "Registration requires a valid invite. Ask an existing user for an invite code.",
  INVITE_INVALID: "That invite code is invalid or already used.",
  invite_invalid: "That invite code is invalid or already used.",
  INVITE_REQUIRED: "Registration requires a valid invite. Ask an existing user for an invite code.",
  invite_required: "Registration requires a valid invite. Ask an existing user for an invite code.",
  PROFILE_NAME_TAKEN: "That profile name is already taken. Choose another.",
  profile_name_taken: "That profile name is already taken. Choose another.",
  email_not_found:
    "The provider did not return an email address. Make sure your email is public or verified.",
  unable_to_create_user: "Could not create a session for this account.",
  unable_to_link_account: "Could not link this account to your existing user."
};

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  github: "GitHub"
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

  // Surface Better Auth OAuth callback errors (?error=…) after provider redirect.
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

  const signInWithSocialMutation = useMutation({
    mutationFn: async (provider: SocialProvider) => {
      const result = await authClient.signIn.social({
        callbackURL: createWebCallbackUrl(redirectTo),
        errorCallbackURL: createOAuthErrorCallbackUrl(redirectTo),
        provider
      });

      if (!result.data) {
        const status = result.error?.status;
        const code = result.error?.code;
        const message = result.error?.message;
        if (message) {
          throw new Error(status ? `[${status}${code ? ` ${code}` : ""}] ${message}` : message);
        }
        throw new Error(
          `${PROVIDER_LABEL[provider]} sign-in failed (no response). ${JSON.stringify(result)}`
        );
      }

      return { data: result.data, provider };
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: ({ data, provider }) => {
      // Better Auth returns { url, redirect: true } for social OAuth. Navigate
      // explicitly so React Query does not race the browser redirect.
      const url = typeof data === "object" && data && "url" in data ? data.url : null;
      if (typeof url === "string" && url.length > 0) {
        toast.success(`Redirecting to ${PROVIDER_LABEL[provider]}…`);
        window.location.assign(url);
        return;
      }
      toast.error(`${PROVIDER_LABEL[provider]} sign-in failed (missing redirect URL).`);
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

  const pendingProvider = signInWithSocialMutation.isPending
    ? signInWithSocialMutation.variables
    : null;
  const isPending = signInWithSocialMutation.isPending || signInWithPasskeyMutation.isPending;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-8 px-4 py-10 sm:px-0",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Link
          className="inline-flex rounded-xl ring-offset-background transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          to="/"
        >
          <LogoIcon aria-hidden className="size-10" />
          <span className="sr-only">{appConfig.site.shortName}</span>
        </Link>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{appConfig.site.shortName}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            Welcome back
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
            Sign in to open your hub, career inbox, and portfolio tools.
          </p>
        </div>
      </div>

      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader className="items-center gap-1 pb-2 text-center">
          <CardTitle className="text-base font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription className="text-sm">
            Continue with a linked account or passkey
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <FieldGroup className="gap-3">
            <Button
              className="h-11 w-full justify-center gap-2.5 font-medium"
              disabled={isPending}
              onClick={() => signInWithSocialMutation.mutate("google")}
              type="button"
              variant="outline"
            >
              {pendingProvider === "google" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <FcGoogle aria-hidden className="size-4 shrink-0" />
              )}
              Continue with Google
            </Button>

            <Button
              className="h-11 w-full justify-center gap-2.5 font-medium"
              disabled={isPending}
              onClick={() => signInWithSocialMutation.mutate("github")}
              type="button"
              variant="outline"
            >
              {pendingProvider === "github" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <FaGithub aria-hidden className="size-4 shrink-0" />
              )}
              Continue with GitHub
            </Button>

            <FieldSeparator className="my-1">Or</FieldSeparator>

            <Button
              className="h-11 w-full justify-center gap-2.5 font-medium"
              disabled={isPending}
              onClick={() => signInWithPasskeyMutation.mutate()}
              type="button"
              variant="secondary"
            >
              {signInWithPasskeyMutation.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <KeyRound aria-hidden className="size-4 shrink-0" />
              )}
              Continue with Passkey
            </Button>
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/terms-of-service"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/privacy-policy"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Need an account?{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              search={
                typeof redirectTo === "string" && redirectTo.length > 0
                  ? { redirect: redirectTo }
                  : {}
              }
              to="/sign-in/create-an-account"
            >
              Create one with an invite
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
