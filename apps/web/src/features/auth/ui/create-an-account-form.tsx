"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { ProfileNameSchema } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup, FieldSeparator } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useAppForm } from "@/shared/form";
import { Container } from "@/shared/ui/container";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

const SIGNUP_ERROR_MESSAGES: Record<string, string> = {
  INVITE_REQUIRED: "An invite code is required to create an account.",
  INVITE_INVALID: "This invite code is invalid or has already been used.",
  PROFILE_NAME_TAKEN: "That profile name is already taken. Try another.",
  PROFILE_NAME_INVALID:
    "Invalid profile name. Use 3–30 lowercase letters, numbers, and single hyphens."
};

function messageForSignUpError(error: { code?: string | null; message?: string | null }): string {
  const code = error.code?.trim();
  if (code && SIGNUP_ERROR_MESSAGES[code]) {
    return SIGNUP_ERROR_MESSAGES[code];
  }
  return error.message?.trim() ?? "Sign up failed";
}

type SignUpEmailBody = {
  email: string;
  name: string;
  password: string;
  /** User additionalField (input: true) — persisted after auth hooks normalize. */
  profileName: string;
  /**
   * Non-persisted body field read by auth hooks (`extractInviteCode`).
   * Must not be treated as a user column.
   */
  inviteCode: string;
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: SignUpEmailBody) => {
      // better-auth sign-up body is open-ended (`.and(z.record(...))`);
      // profileName is additionalFields.input; inviteCode is body-only for hooks.
      const result = await authClient.signUp.email(values as never);

      if (!result.data) {
        const err = new Error(messageForSignUpError(result.error ?? {}));
        (err as Error & { code?: string }).code = result.error?.code ?? undefined;
        throw err;
      }

      return result;
    },
    onError: (error: Error & { code?: string }) => {
      toast.error(messageForSignUpError(error));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      await navigate({
        to: redirectTo
      });
      toast.success("Sign up successful");
    }
  });

  const form = useAppForm({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
      profileName: "",
      inviteCode: inviteCodePrefill
    },
    onSubmit: async ({ value }) => {
      const { email, name, password, profileName, inviteCode } = value;
      signUpMutation.mutate({
        email,
        name,
        password,
        profileName,
        inviteCode: inviteCode.trim()
      });
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          email: z.email("Invalid email address"),
          name: z.string().min(2, "Name must be at least 2 characters"),
          password: z.string().min(8, "Password must be at least 8 characters"),
          profileName: ProfileNameSchema,
          // Empty allowed for first-user bootstrap; server returns INVITE_REQUIRED otherwise.
          inviteCode: z.string().trim()
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"]
        })
    }
  });

  if (isPending) {
    return <DefaultLoader />;
  }

  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link to="/" className="flex flex-col items-center gap-2 font-medium">
              <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
              <span className="sr-only">{appConfig.site.shortName}</span>
            </Link>
            <h1 className="text-xl font-bold">Create an account</h1>
            {/* Plain text — FieldDescription must live inside Field.Root (Base UI). */}
            <p className="text-sm text-muted-foreground">
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
          </div>

          <form.AppField name="name">
            {(field) => <field.InputField label="Name" placeholder="John Doe" />}
          </form.AppField>

          <form.AppField name="profileName">
            {(field) => (
              <field.InputField
                label="Profile name"
                placeholder="johndoe"
                description="Public URL: /your-profile-name (lowercase, hyphens ok)"
              />
            )}
          </form.AppField>

          <form.AppField name="email">
            {(field) => (
              <field.InputField label="Email" placeholder="john-doe@example.com" type="email" />
            )}
          </form.AppField>

          <form.AppField name="inviteCode">
            {(field) => (
              <field.InputField label="Invite code" placeholder="Paste your invite code" />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => <field.InputField label="Password" type="password" />}
          </form.AppField>

          <form.AppField name="confirmPassword">
            {(field) => <field.InputField label="Confirm Password" type="password" />}
          </form.AppField>

          <form.AppForm>
            <form.SubmitButton isLoading={signUpMutation.isPending}>
              {signUpMutation.isPending ? "Creating account..." : "Create Account"}
            </form.SubmitButton>
          </form.AppForm>

          <FieldSeparator>Or</FieldSeparator>

          {/*
            SVG without size classes filled the grid cell (broken “G” + stacked label).
            Match sign-in: coss Button + fixed icon size.
            OAuth invite preflight (cookie / additionalData) still TODO when signing up via Google.
          */}
          <Button
            className="h-11 w-full justify-center gap-2.5 font-medium"
            disabled={signUpMutation.isPending}
            onClick={() =>
              toast.error(
                "Use email + invite for new accounts, or sign in with Google if you already have one."
              )
            }
            type="button"
            variant="outline"
          >
            {signUpMutation.isPending ? (
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
            ) : (
              <FcGoogle aria-hidden className="size-4 shrink-0" />
            )}
            Continue with Google
          </Button>
        </FieldGroup>
      </form>
      <p className="px-6 text-center text-xs leading-5 text-muted-foreground">
        By clicking continue, you agree to our{" "}
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
    </Container>
  );
}
