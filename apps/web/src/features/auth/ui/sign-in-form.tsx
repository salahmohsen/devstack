import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { FieldDescription, FieldGroup } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { appConfig } from "@/config/app.config";

function createWebCallbackUrl(redirectTo: NavigateOptions["to"]): string {
  const baseUrl = ENV_WEB_ISOMORPHIC.VITE_WEB_URL.replace(/\/$/, "");
  const path = redirectTo?.startsWith("/") ? redirectTo : `/${redirectTo}`;

  return `${baseUrl}${path}`;
}

export function SignInForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateOptions["to"] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signInWithGithubMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        callbackURL: createWebCallbackUrl(redirectTo),
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

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      toast.success("Redirecting to GitHub…");
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
    <div className={cn("w-full max-w-md space-y-5", className)} {...props}>
      <Card className="rounded-sm border border-border/80 bg-background shadow-none" size={"sm"}>
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
      </Card>
      <FieldDescription className="mt-6 px-6 text-center text-xs leading-6">
        By continuing, you agree to our{" "}
        <Link className="text-foreground underline underline-offset-4" to="/terms-of-service">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link className="text-foreground underline underline-offset-4" to="/privacy-policy">
          Privacy Policy
        </Link>
        .
      </FieldDescription>
    </div>
  );
}
