"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import {
  type GithubConfigOutput,
  UpdateGithubConfigInputSchema
} from "@tsu-stack/core/github-config";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardPanel } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { Container } from "@/shared/ui/container";
import { DefaultLoader } from "@/shared/ui/default-loader";

import { PageLayout } from "@/widgets/items-page";

import { useUpdateGithubConfigMutation } from "@/pages/dashboard/api/update-github-config.mutation";

export function GithubSettings() {
  const { user } = useAuthSuspense();
  const githubConfigQuery = useQuery(orpcQueryClient.githubConfig.get.queryOptions());

  if (githubConfigQuery.isLoading && !githubConfigQuery.data) {
    return (
      <Container className="py-16">
        <DefaultLoader className="mx-auto" />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  const githubConfig = githubConfigQuery.data;
  const settingsKey = `${githubConfig?.updatedAt?.toISOString() ?? "never"}:${githubConfig?.githubUsername ?? "none"}:${
    githubConfig?.hasGithubToken ? "configured" : "missing"
  }`;

  return <GithubSettingsForm githubConfig={githubConfig} key={settingsKey} />;
}

function GithubSettingsForm({ githubConfig }: { githubConfig?: GithubConfigOutput }) {
  const queryClient = useQueryClient();
  const updateGithubConfigMutation = useUpdateGithubConfigMutation();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const hasGithubToken = githubConfig?.hasGithubToken ?? false;

  const clearTokenMutation = useMutation(
    orpcQueryClient.githubConfig.update.mutationOptions({
      onSuccess: async (settings) => {
        queryClient.setQueryData(
          orpcQueryClient.githubConfig.get.queryOptions().queryKey,
          settings
        );
        toast.success("GitHub token cleared.");
      }
    })
  );

  const form = useAppForm({
    defaultValues: {
      clearGithubToken: false,
      githubToken: githubConfig?.githubToken ?? "",
      githubUsername: githubConfig?.githubUsername ?? ""
    },
    validators: {
      onBlur: createZodFormValidator(UpdateGithubConfigInputSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        const settings = await updateGithubConfigMutation.mutateAsync(value);
        form.reset({ ...value, githubToken: settings.githubToken ?? "" });
        toast.success("GitHub config saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save GitHub config.");
      }
    }
  });

  return (
    <PageLayout>
      <Frame>
        <FrameHeader>
          <FrameTitle>GitHub</FrameTitle>
          <FrameDescription>Connect a GitHub account to fetch public data.</FrameDescription>
        </FrameHeader>

        <FramePanel>
          <Card>
            <CardPanel>
              <p className="mb-4 text-sm font-medium">GitHub Credentials</p>
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
                        placeholder={hasGithubToken ? "" : "ghp_..."}
                        description={
                          hasGithubToken
                            ? "The saved token is masked. Enter a new value to rotate it."
                            : "Enter a GitHub personal access token to fetch public data."
                        }
                      />
                    )}
                  </form.AppField>

                  <form.AppForm>
                    <form.SubmitButton
                      variant="outline"
                      isLoading={updateGithubConfigMutation.isPending}
                    >
                      {updateGithubConfigMutation.isPending ? "Saving..." : "Save settings"}
                    </form.SubmitButton>
                  </form.AppForm>
                </FieldGroup>
              </form>
            </CardPanel>
          </Card>
        </FramePanel>

        {hasGithubToken && (
          <FramePanel>
            <Card className="bg-destructive/4">
              <CardPanel>
                <p className="text-sm text-muted-foreground">Danger zone</p>
                <h2 className="mt-2 text-lg font-medium text-destructive">Clear saved token</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Disconnect the saved GitHub token. The username will be preserved so you can
                  reconnect later without re-entering it.
                </p>

                <Button
                  className="mt-4"
                  disabled={clearTokenMutation.isPending}
                  onClick={() => setClearDialogOpen(true)}
                  variant="destructive"
                >
                  {clearTokenMutation.isPending ? "Clearing..." : "Clear saved token"}
                </Button>
              </CardPanel>
            </Card>
          </FramePanel>
        )}
      </Frame>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear saved token?</DialogTitle>
            <DialogDescription>
              This will remove the stored GitHub token. The GitHub profile page will no longer show
              live data until a new token is saved. Your GitHub username will be preserved.
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
                  githubUsername: githubConfig?.githubUsername ?? ""
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
    </PageLayout>
  );
}
