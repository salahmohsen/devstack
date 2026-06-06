import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fingerprint } from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { FieldDescription, FieldGroup } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { appConfig } from "@/config/app.config";

function createWebCallbackUrl(redirectTo: NavigateTo): string {
  const baseUrl = ENV_WEB_ISOMORPHIC.VITE_WEB_URL.replace(/\/$/, "");
  const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;

  return `${baseUrl}${path}`;
}

export function SignInForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateTo }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signInWithGithubMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        callbackURL: createWebCallbackUrl(redirectTo),
        provider: "github"
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? "GitHub sign-in failed.");
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
      <Card className="border border-border/80 bg-background shadow-none">
        <CardHeader className="items-center text-center">
          <Link className="mb-2 inline-flex" href="/">
            <span className="sr-only">{appConfig.site.shortName}</span>
          </Link>
          <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Button
              className="w-full justify-center gap-2"
              disabled={isPending}
              onClick={() => signInWithGithubMutation.mutate()}
              type="button"
              variant="outline"
            >
              <FaGithub className="size-4" />
              Continue with GitHub
            </Button>
            <Button
              className="w-full justify-center gap-2"
              disabled={isPending}
              onClick={() => signInWithPasskeyMutation.mutate()}
              type="button"
              variant="outline"
            >
              <Fingerprint className="size-4" />
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
