"use client";

import { useStore } from "@tanstack/react-form";
import { Edit, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { UsernameSchema } from "@tsu-stack/core";
import { Button, ButtonAnimateScope } from "@tsu-stack/ui/components/button";
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
  useRenameUsernameMutation,
  useUsernameAvailability
} from "@/features/profile";

import { appConfig } from "@/config/app.config";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { UsernameRenameSubmit } from "./username-rename-submit";

const RenameUsernameFormSchema = z.object({
  username: UsernameSchema
});

function availabilityFieldError(availability: {
  username: string;
  isChecking: boolean;
  status: string | null;
  message?: string;
}) {
  if (availability.isChecking) return undefined;
  if (availability.status === "taken" || availability.status === "reserved") {
    return {
      message: availability.message ?? "That username is already taken.",
      status: availability.status
    };
  }
  if (availability.status === "error") {
    return availability.message ?? "Could not check username availability";
  }
  return undefined;
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
      const parsed = UsernameSchema.safeParse(value.username);
      if (!parsed.success) return;
      try {
        const check = await checkUsernameAvailability(parsed.data);
        if (!check.available) {
          renameForm.setFieldMeta("username", (prev) => {
            return {
              ...prev,
              errorMap: {
                ...prev?.errorMap,
                onServer: {
                  message: check.message ?? "That username is already taken.",
                  status: check.status
                }
              }
            };
          });
          return;
        }
        await renameMutation.mutateAsync({ username: parsed.data });
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
  const availability = useUsernameAvailability({
    value: renameUsernameValue,
    currentUsername,
    enabled: isUsernameEditing && Boolean(currentUsername)
  });

  useEffect(() => {
    if (!isUsernameEditing || !currentUsername) return;
    const error = availabilityFieldError(availability);
    renameForm.setFieldMeta("username", (prev) => {
      return {
        ...prev,
        errorMap: {
          ...prev?.errorMap,
          onServer: error
        }
      };
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable
  }, [
    availability.isChecking,
    availability.message,
    availability.status,
    availability.username,
    currentUsername,
    isUsernameEditing
  ]);

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
                defaultMeta={{ isTouched: true }}
                validators={{
                  onChange: ({ value }) => {
                    const parsed = UsernameSchema.safeParse(value);
                    if (!parsed.success) {
                      return parsed.error.issues[0]?.message ?? "Invalid username";
                    }
                    return undefined;
                  }
                }}
              >
                {(field) => (
                  <field.UsernameField
                    readOnly={!isUsernameEditing}
                    ariaLabel="Username"
                    placeholder="your-name"
                    classNames={{ field: "w-full" }}
                    actions={
                      <ButtonAnimateScope>
                        {isUsernameEditing ? (
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
                                  username: state.values.username,
                                  errors: state.fieldMeta.username?.errors ?? []
                                };
                              }}
                            >
                              {({ isSubmitting, username, errors }) => (
                                <UsernameRenameSubmit
                                  currentUsername={currentUsername}
                                  username={username}
                                  isChecking={availability.isChecking}
                                  availability={
                                    availability.username === username.trim().toLowerCase() ||
                                    availability.username === username
                                      ? availability.status
                                      : null
                                  }
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
                        )}
                      </ButtonAnimateScope>
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
