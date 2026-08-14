"use client";

import { useStore } from "@tanstack/react-form";
import { Edit, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { UsernameSchema } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { GroupSeparator } from "@tsu-stack/ui/components/group";

import { useAppForm } from "@/shared/form";
import { sessionUsernameFromUser } from "@/shared/lib/session-username";

import {
  checkUsernameAvailability,
  useGetProfileQuery,
  useRenameUsernameMutation
} from "@/features/profile";

import { appConfig } from "@/config/app.config";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { UsernameRenameSubmit } from "./username-rename-submit";

const RenameUsernameFormSchema = z.object({
  username: UsernameSchema
});

function isUsernameCheckAbort(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted) return true;
  return error instanceof DOMException && error.name === "AbortError";
}

/** Format is sync; this is the network availability check. Never treat abort as "available". */
async function validateUsernameAvailable(
  value: string,
  currentUsername: string,
  signal?: AbortSignal
) {
  const parsed = UsernameSchema.safeParse(value);
  if (!parsed.success) return undefined;
  if (parsed.data === currentUsername) return undefined;
  try {
    const result = await checkUsernameAvailability(parsed.data, signal);
    if (!result.available) {
      return {
        message: result.message ?? "That username is already taken.",
        status: result.status
      };
    }
    return undefined;
  } catch (error) {
    if (isUsernameCheckAbort(error, signal)) throw error;
    return "Could not check username availability";
  }
}

function publicProfileUrl(username: string): string {
  const base = appConfig.site.baseUrl.replace(/\/$/, "");
  return `${base}/${username}`;
}

export function UsernameSettingsCard() {
  const { data: session } = authClient.useSession();
  const profileQuery = useGetProfileQuery();
  const renameMutation = useRenameUsernameMutation();
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);

  const currentUsername =
    profileQuery.data?.username ?? sessionUsernameFromUser(session?.user) ?? "";

  const renameForm = useAppForm({
    defaultValues: { username: currentUsername },
    validators: {
      onSubmit: RenameUsernameFormSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await renameMutation.mutateAsync({ username: value.username });
        setIsUsernameEditing(false);
      } catch {
        // Typed toasts are handled in useRenameUsernameMutation onError.
      }
    }
  });

  useEffect(() => {
    if (renameForm.store.state.isDirty) return;
    if (currentUsername) {
      renameForm.reset({ username: currentUsername });
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable; re-sync only when server username changes
  }, [currentUsername]);

  useEffect(() => {
    if (!isUsernameEditing) return;
    document.getElementById("username")?.focus();
  }, [isUsernameEditing]);

  const renameUsernameValue = useStore(renameForm.store, (state) => state.values.username);
  const isRenameDirty = Boolean(currentUsername) && renameUsernameValue !== currentUsername;
  const leaveGuard = useSettingsDirtyGuard(isRenameDirty, {
    onDiscard: () => {
      renameForm.reset({ username: currentUsername });
      setIsUsernameEditing(false);
    }
  });

  const publicUrl = useMemo(
    () => (currentUsername ? publicProfileUrl(currentUsername) : ""),
    [currentUsername]
  );

  return (
    <>
      {leaveGuard.alertDialog}
      <Frame>
        <FrameHeader className="px-4 py-3">
          <FrameTitle>Username</FrameTitle>
          <FrameDescription className="text-xs text-pretty">
            Your portfolio lives at this path. Use 3–30 lowercase letters, numbers, and single
            hyphens. Renaming keeps the old name as a redirect alias.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="p-3">
          {currentUsername ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void renameForm.handleSubmit();
              }}
              className="flex flex-col gap-3"
            >
              <renameForm.AppField
                name="username"
                asyncAlways
                validators={{
                  onChange: ({ value }) => {
                    const parsed = UsernameSchema.safeParse(value);
                    if (!parsed.success) {
                      return parsed.error.issues[0]?.message ?? "Invalid username";
                    }
                    return undefined;
                  },
                  onChangeAsyncDebounceMs: 400,
                  onChangeAsync: ({ value, signal }) =>
                    validateUsernameAvailable(value, currentUsername, signal),
                  onBlurAsync: ({ value, signal }) =>
                    validateUsernameAvailable(value, currentUsername, signal)
                }}
              >
                {(field) => (
                  <field.UsernameField
                    readOnly={!isUsernameEditing}
                    ariaLabel="Username"
                    placeholder="your-name"
                    classNames={{ field: "w-full" }}
                    actions={
                      isUsernameEditing ? (
                        <>
                          <GroupSeparator />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9 shrink-0 self-stretch rounded-lg"
                            onClick={() => {
                              renameForm.reset({ username: currentUsername });
                              setIsUsernameEditing(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <GroupSeparator />
                          <renameForm.Subscribe
                            selector={(state) => {
                              return {
                                isSubmitting: state.isSubmitting,
                                isValidating: state.isValidating,
                                username: state.values.username,
                                errors: state.fieldMeta.username?.errors ?? []
                              };
                            }}
                          >
                            {({ isSubmitting, isValidating, username, errors }) => (
                              <UsernameRenameSubmit
                                currentUsername={currentUsername}
                                username={username}
                                isValidating={isValidating}
                                isSubmitting={isSubmitting || renameMutation.isPending}
                                errors={errors}
                              />
                            )}
                          </renameForm.Subscribe>
                        </>
                      ) : (
                        <>
                          <GroupSeparator />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-9 shrink-0 self-stretch rounded-lg"
                            onClick={() => setIsUsernameEditing(true)}
                          >
                            <Edit aria-hidden="true" />
                            Edit
                          </Button>
                        </>
                      )
                    }
                  />
                )}
              </renameForm.AppField>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  value={publicUrl}
                  label="Copy URL"
                  showLabel
                  size="sm"
                  variant="outline"
                  onError={() => toast.error("Could not copy URL")}
                />
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={publicUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                      aria-label="Open public profile"
                    />
                  }
                >
                  <ExternalLink aria-hidden="true" />
                  Open
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Loading username…</p>
          )}
        </FramePanel>
      </Frame>
    </>
  );
}
