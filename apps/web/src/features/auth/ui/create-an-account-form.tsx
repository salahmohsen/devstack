"use client";

import { useMutation } from "@tanstack/react-query";
import { Link, type NavigateOptions } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
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
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { AiLoader } from "@/shared/ui/ai-loader";
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
      // fall through
    }
  }

  const raw = typeof redirectTo === "string" && redirectTo.length > 0 ? redirectTo : "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${baseUrl}${path}`;
}

function createOAuthErrorCallbackUrl(): string {
  const baseUrl = stripTrailingSlashes(ENV_WEB_ISOMORPHIC.VITE_WEB_URL);
  return `${baseUrl}/sign-in/create-an-account`;
}

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  github: "GitHub"
};

export function CreateAnAccountForm({
  redirectTo = "/",
  inviteCode: inviteCodePrefill = "",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  redirectTo?: NavigateOptions["to"];
  /** Prefill from `?invite=` search param. */
  inviteCode?: string;
}) {
  const { isPending: authPending } = useAuth();
  const inviteCode = inviteCodePrefill.trim();

  const signUpWithSocialMutation = useMutation({
    mutationFn: async (provider: SocialProvider) => {
      const result = await authClient.signIn.social({
        callbackURL: createWebCallbackUrl(typeof redirectTo === "string" ? redirectTo : "/"),
        errorCallbackURL: createOAuthErrorCallbackUrl(),
        provider,
        requestSignUp: true,
        ...(inviteCode.length > 0 ? { additionalData: { inviteCode } } : {})
      });

      if (!result.data) {
        const message = result.error?.message;
        if (message) throw new Error(message);
        throw new Error(`${PROVIDER_LABEL[provider]} sign-up failed (no response).`);
      }

      return { data: result.data, provider };
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: ({ data, provider }) => {
      const url = typeof data === "object" && data && "url" in data ? data.url : null;
      if (typeof url === "string" && url.length > 0) {
        toast.success(`Redirecting to ${PROVIDER_LABEL[provider]}…`);
        window.location.assign(url);
        return;
      }
      toast.error(`${PROVIDER_LABEL[provider]} sign-up failed (missing redirect URL).`);
    }
  });

  const pendingProvider = signUpWithSocialMutation.isPending
    ? signUpWithSocialMutation.variables
    : null;
  const isPending = signUpWithSocialMutation.isPending;

  if (authPending) {
    return <AiLoader />;
  }

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
            {inviteCode ? "You've been invited" : "Create an account"}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
            Continue with Google or GitHub. Registration is invite-only after the first user.
          </p>
        </div>
      </div>

      <Card className="w-full border-border/80 shadow-sm">
        <CardHeader className="items-center gap-1 pb-2 text-center">
          <CardTitle className="text-base font-semibold tracking-tight">
            Accept invitation
          </CardTitle>
          <CardDescription className="text-sm">
            {inviteCode
              ? "Continue with Google or GitHub to join."
              : "Use Google or GitHub. Ask an existing member for an invite if signup is closed."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <FieldGroup className="gap-3">
            <Button
              className="h-11 w-full justify-center gap-2.5 font-medium"
              disabled={isPending}
              onClick={() => signUpWithSocialMutation.mutate("google")}
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
              onClick={() => signUpWithSocialMutation.mutate("github")}
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
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-center text-xs leading-5 text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/sign-in"
              search={
                typeof redirectTo === "string" && redirectTo.length > 0
                  ? { redirect: redirectTo }
                  : {}
              }
            >
              Sign in
            </Link>
          </p>
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
        </CardFooter>
      </Card>
    </div>
  );
}
