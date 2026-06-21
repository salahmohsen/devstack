"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { FieldDescription, FieldGroup, FieldSeparator } from "@tsu-stack/ui/components/field";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useAppForm } from "@/shared/form";
import { Container } from "@/shared/ui/container";
import { DefaultLoader } from "@/shared/ui/default-loader";
import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

export function CreateAnAccountForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateOptions["to"] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: { email: string; name: string; password: string }) => {
      const result = await authClient.signUp.email({
        email: values.email,
        name: values.name,
        password: values.password
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? "Sign up failed");
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Sign up failed");
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
      password: ""
    },
    onSubmit: async ({ value }) => {
      const { email, name, password } = value;
      signUpMutation.mutate({ email, name, password });
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          email: z.email("Invalid email address"),
          name: z.string().min(2, "Name must be at least 2 characters"),
          password: z.string().min(8, "Password must be at least 8 characters")
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
            <FieldDescription>
              Already have an account?{" "}
              <Link to="/sign-in" search={{ redirect: redirectTo }}>
                Sign in
              </Link>
            </FieldDescription>
          </div>

          <form.AppField name="name">
            {(field) => <field.InputField label="Name" placeholder="John Doe" />}
          </form.AppField>

          <form.AppField name="email">
            {(field) => (
              <field.InputField label="Email" placeholder="john-doe@example.com" type="email" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xs border border-input bg-background px-4 py-2 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              onClick={() => toast.error("Not yet implemented.")}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <Link to="/terms-of-service">Terms of Service</Link>{" "}
        and <Link to="/privacy-policy">Privacy Policy</Link>.
      </FieldDescription>
    </Container>
  );
}
