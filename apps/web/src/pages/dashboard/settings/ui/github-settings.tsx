"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type AppSettingsOutput, UpdateAppSettingsInputSchema } from "@tsu-stack/core/app-settings";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { Container } from "@/shared/ui/container";
import { DefaultLoader } from "@/shared/ui/default-loader";

import { PageLayout } from "@/widgets/items-page";

import { useUpdateAppSettingsMutation } from "@/pages/dashboard/api/update-app-settings.mutation";

export function GithubSettings() {
  const { user } = useAuthSuspense();
  const appSettingsQuery = useQuery(orpc.appSettings.get.queryOptions());

  if (appSettingsQuery.isLoading && !appSettingsQuery.data) {
    return (
      <Container className="py-16">
        <DefaultLoader className="mx-auto" />
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

  return <GithubSettingsForm appSettings={appSettings} key={settingsKey} />;
}

function GithubSettingsForm({ appSettings }: { appSettings?: AppSettingsOutput }) {
  const queryClient = useQueryClient();
  const updateAppSettingsMutation = useUpdateAppSettingsMutation();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const hasGithubToken = appSettings?.hasGithubToken ?? false;

  const clearTokenMutation = useMutation(
    orpc.appSettings.update.mutationOptions({
      onSuccess: async (settings) => {
        queryClient.setQueryData(orpc.appSettings.get.queryOptions().queryKey, settings);
        toast.success("GitHub token cleared.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      clearGithubToken: false,
      githubToken: appSettings?.githubToken ?? "",
      githubUsername: appSettings?.githubUsername ?? ""
    },
    validators: {
      onBlur: createZodFormValidator(UpdateAppSettingsInputSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        const settings = await updateAppSettingsMutation.mutateAsync(value);
        form.reset({ ...value, githubToken: settings.githubToken ?? "" });
        toast.success("App settings saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save app settings.");
      }
    }
  });

  return (
    <PageLayout>
      <section className="rounded-sm border border-border p-6">
        <p className="mb-8 text-sm text-muted-foreground">GitHub Credentials</p>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField name="githubUsername">
              {(field) => (
                <field.InputField
                  label="GitHub username"
                  placeholder="octocat"
                  description={
                    "This username is used with the saved token when public GitHub data is fetched."
                  }
                />
              )}
            </form.AppField>

            <form.AppField name="githubToken">
              {(field) => (
                <field.PasswordInputField
                  label="Public GitHub token"
                  placeholder={hasGithubToken ? "" : "github_pat_..."}
                  description={
                    hasGithubToken
                      ? "The saved token is masked. Enter a new value to rotate it."
                      : "Enter a GitHub personal access token to fetch public data."
                  }
                />
              )}
            </form.AppField>

            <form.AppForm>
              <form.SubmitButton variant="outline" isLoading={updateAppSettingsMutation.isPending}>
                {updateAppSettingsMutation.isPending ? "Saving..." : "Save settings"}
              </form.SubmitButton>
            </form.AppForm>
          </FieldGroup>
        </form>
      </section>

      {hasGithubToken && (
        <section className="border-destructive/20 bg-destructive/5 rounded-xl border p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Danger zone</p>
            <h2 className="text-destructive mt-2 text-lg font-medium">Clear saved token</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Disconnect the saved GitHub token. The username will be preserved so you can reconnect
              later without re-entering it.
            </p>
          </div>

          <Button
            disabled={clearTokenMutation.isPending}
            onClick={() => setClearDialogOpen(true)}
            variant="destructive"
          >
            {clearTokenMutation.isPending ? "Clearing..." : "Clear saved token"}
          </Button>

          <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear saved token?</DialogTitle>
                <DialogDescription>
                  This will remove the stored GitHub token. The GitHub profile page will no longer
                  show live data until a new token is saved. Your GitHub username will be preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setClearDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={clearTokenMutation.isPending}
                  onClick={async () => {
                    await clearTokenMutation.mutateAsync({
                      clearGithubToken: true,
                      githubToken: undefined,
                      githubUsername: appSettings?.githubUsername ?? ""
                    });
                    setClearDialogOpen(false);
                  }}
                  variant="destructive"
                >
                  {clearTokenMutation.isPending ? "Clearing..." : "Yes, clear token"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </PageLayout>
  );
}
