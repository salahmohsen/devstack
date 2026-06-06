import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type AppSettingsOutput,
  UpdateAppSettingsInputSchema
} from "@tsu-stack/api/routers/app-settings/types";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@tsu-stack/ui/components/field";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { Container } from "@/shared/ui/container";

import { useUpdateAppSettingsMutation } from "@/pages/dashboard/api/update-app-settings.mutation";

type FormState = {
  clearGithubToken: boolean;
  githubToken: string;
  githubUsername: string;
};

export function GithubConfigPage() {
  const { user } = useAuthSuspense();
  const appSettingsQuery = useQuery(orpc.appSettings.get.queryOptions());

  if (appSettingsQuery.isLoading && !appSettingsQuery.data) {
    return (
      <Container className="py-16">
        <Spinner className="mx-auto" />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  const appSettings = appSettingsQuery.data;
  const settingsKey = `${appSettings?.updatedAt ?? "never"}:${appSettings?.githubUsername ?? "none"}:${
    appSettings?.hasGithubToken ? "configured" : "missing"
  }`;

  return <GithubConfigForm appSettings={appSettings} key={settingsKey} userEmail={user.email} />;
}

function GithubConfigForm({
  appSettings,
  userEmail
}: {
  appSettings?: AppSettingsOutput;
  userEmail: string;
}) {
  const updateAppSettingsMutation = useUpdateAppSettingsMutation();
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formState, setFormState] = useState<FormState>({
    clearGithubToken: false,
    githubToken: "",
    githubUsername: appSettings?.githubUsername ?? ""
  });
  const hasGithubToken = appSettings?.hasGithubToken ?? false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedInput = UpdateAppSettingsInputSchema.safeParse({
      clearGithubToken: formState.clearGithubToken,
      githubToken: formState.githubToken,
      githubUsername: formState.githubUsername
    });

    if (!parsedInput.success) {
      const fieldErrors = parsedInput.error.flatten().fieldErrors;

      setErrors({
        clearGithubToken: fieldErrors.clearGithubToken?.[0],
        githubToken: fieldErrors.githubToken?.[0],
        githubUsername: fieldErrors.githubUsername?.[0]
      });
      return;
    }

    setErrors({});

    try {
      await updateAppSettingsMutation.mutateAsync(parsedInput.data);
      setFormState((current) => {
        return {
          ...current,
          clearGithubToken: false,
          githubToken: ""
        };
      });
      toast.success("App settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save app settings.");
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      <section className="border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">GitHub Config</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Manage the GitHub account and token used for public portfolio data on the home page. The
          token is write-only here and is never sent back to the browser after it is saved.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Signed in as {userEmail}</p>
      </section>

      <section className="border border-border bg-background p-6">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">GitHub Credentials</p>
          <h2 className="mt-2 text-xl font-medium">Connection Settings</h2>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="githubUsername">GitHub username</FieldLabel>
              <Input
                id="githubUsername"
                name="githubUsername"
                onChange={(event) => {
                  setFormState((current) => {
                    return {
                      ...current,
                      githubUsername: event.target.value
                    };
                  });
                }}
                placeholder="octocat"
                value={formState.githubUsername}
              />
              <FieldDescription>
                This username is used with the saved token when public GitHub data is fetched.
              </FieldDescription>
              <FieldError>{errors.githubUsername}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="githubToken">GitHub token</FieldLabel>
              <Input
                id="githubToken"
                name="githubToken"
                onChange={(event) => {
                  setFormState((current) => {
                    return {
                      ...current,
                      githubToken: event.target.value
                    };
                  });
                }}
                placeholder={
                  hasGithubToken ? "Leave blank to keep the saved token" : "github_pat_..."
                }
                type="password"
                value={formState.githubToken}
              />
              <FieldDescription>
                Leave this blank to keep the existing token. Enter a new value to rotate it.
              </FieldDescription>
              <FieldError>{errors.githubToken}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="clearGithubToken">Clear saved token</FieldLabel>
              <input
                aria-describedby="clearGithubTokenDescription"
                aria-label="Clear saved token"
                checked={formState.clearGithubToken}
                className="size-4 rounded border"
                id="clearGithubToken"
                name="clearGithubToken"
                onChange={(event) => {
                  setFormState((current) => {
                    return {
                      ...current,
                      clearGithubToken: event.target.checked
                    };
                  });
                }}
                type="checkbox"
              />
              <FieldDescription id="clearGithubTokenDescription">
                Use this if you want to disconnect the current GitHub token without deleting the
                username.
              </FieldDescription>
            </Field>

            <Field className="border-t border-border pt-6">
              <Button
                disabled={updateAppSettingsMutation.isPending}
                type="submit"
                variant="outline"
              >
                {updateAppSettingsMutation.isPending ? "Saving..." : "Save settings"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </section>
    </div>
  );
}
