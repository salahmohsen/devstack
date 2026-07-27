import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Copy,
  Edit,
  ExternalLink,
  FileUp,
  UserRoundPen,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { authClient } from "@tsu-stack/auth/react/auth-client";
import { contactTypeSchema, ProfileNameSchema, ProfileUpdateInputSchema } from "@tsu-stack/core";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPrimitive,
  ComboboxTrigger
} from "@tsu-stack/ui/components/combobox";
import { FieldGroup, FieldSet } from "@tsu-stack/ui/components/field";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { ButtonGroup, Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Switch } from "@tsu-stack/ui/components/switch";

import { useAppForm } from "@/shared/form";
import { IconLetter } from "@/shared/ui/icon";
import { IconPicker, PickerIconRenderer } from "@/shared/ui/icon-picker";

import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  getUpdateProfileMutationOptions,
  useRenameProfileMutation,
  type ProfileUpdateInput
} from "@/features/profile";

import { appConfig } from "@/config/app.config";

const RenameProfileFormSchema = z.object({
  profileName: ProfileNameSchema
});

const CONTACT_TYPES = contactTypeSchema.options;

function getInitials(name: string | null | undefined): string {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("") ?? ""
  );
}

function ContactLink({
  children,
  href,
  icon
}: {
  children: React.ReactNode;
  href?: string;
  icon: React.ReactNode;
}) {
  if (!children) return null;

  const className = "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground";

  if (href) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {icon}
        {children}
      </a>
    );
  }

  return (
    <span className={className}>
      {icon}
      {children}
    </span>
  );
}

function publicProfilePath(profileName: string): string {
  return `/${profileName}`;
}

function publicProfileUrl(profileName: string): string {
  const base = appConfig.site.baseUrl.replace(/\/$/, "");
  return `${base}${publicProfilePath(profileName)}`;
}

export function ProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const profileQuery = useQuery(orpcQueryClient.profile.get.queryOptions());
  const [isEditing, setIsEditing] = useState(false);
  const renameMutation = useRenameProfileMutation();

  const currentProfileName =
    profileQuery.data?.profileName ??
    (session?.user as { profileName?: string } | undefined)?.profileName ??
    "";

  const serverValues = {
    name: profileQuery.data?.name ?? session?.user?.name ?? "",
    email: profileQuery.data?.email ?? session?.user?.email ?? "",
    contacts: (profileQuery.data?.contacts ?? []).map((c) => {
      return {
        id: c.id,
        icon: c.icon,
        type: c.type,
        value: c.value,
        includedInPortfolio: !!c.portfolioEntryId
      };
    })
  } as ProfileUpdateInput;

  const updateMutation = useMutation({
    ...getUpdateProfileMutationOptions(),
    onSuccess: (data) => {
      queryClient.setQueryData(orpcQueryClient.profile.get.queryOptions().queryKey, data);
      void queryClient.invalidateQueries({
        queryKey: getPortfolioListQueryKey()
      });
      form.reset({
        name: data.name,
        email: data.email,
        contacts: (data.contacts ?? []).map((c) => {
          return {
            id: c.id,
            icon: c.icon,
            type: c.type,
            value: c.value,
            includedInPortfolio: !!c.portfolioEntryId
          };
        })
      });
      toast.success("Profile updated successfully");
    }
  });

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: ProfileUpdateInputSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await updateMutation.mutateAsync({
          name: value.name.trim(),
          email: value.email.trim(),
          contacts: value.contacts
        });
        setIsEditing(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update profile");
      }
    }
  });

  const renameForm = useAppForm({
    defaultValues: { profileName: currentProfileName },
    validators: {
      onChange: RenameProfileFormSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await renameMutation.mutateAsync({ profileName: value.profileName });
      } catch {
        // Typed toasts are handled in useRenameProfileMutation onError.
      }
    }
  });

  useEffect(() => {
    if (currentProfileName) {
      renameForm.reset({ profileName: currentProfileName });
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable; re-sync only when server profileName changes
  }, [currentProfileName]);

  const handleCancel = () => {
    form.reset(serverValues);
    setIsEditing(false);
  };

  const publicUrl = useMemo(
    () => (currentProfileName ? publicProfileUrl(currentProfileName) : ""),
    [currentProfileName]
  );
  const publicPath = currentProfileName ? publicProfilePath(currentProfileName) : "";

  const handleCopyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public profile URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const userImage = session?.user?.image ?? undefined;
  const displayName = profileQuery.data?.name ?? session?.user?.name ?? "";
  const displayEmail = profileQuery.data?.email ?? session?.user?.email ?? "";
  const contacts = profileQuery.data?.contacts ?? [];

  return (
    <div className="flex flex-col gap-6">
      <form.Subscribe
        selector={(state) => {
          return {
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
            values: state.values
          };
        }}
      >
        {({ canSubmit, isSubmitting, values }) => (
          <Frame>
            <FrameHeader>
              <div className="flex w-full items-start justify-between gap-4">
                <div className="min-w-0">
                  <FrameTitle>Profile</FrameTitle>
                  <FrameDescription>
                    Manage your personal information and contacts.
                  </FrameDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" render={<Link to="/dashboard/onboarding" />}>
                    <FileUp aria-hidden="true" />
                    Import from resume
                  </Button>
                  {isEditing ? (
                    <ButtonGroup>
                      <Button onClick={handleCancel} size="sm" variant="outline">
                        Cancel
                      </Button>
                      <GroupSeparator />
                      <Button
                        disabled={!canSubmit || isSubmitting}
                        loading={isSubmitting}
                        onClick={() => void form.handleSubmit()}
                        size="sm"
                      >
                        Save Changes
                      </Button>
                    </ButtonGroup>
                  ) : (
                    <Button
                      loading={profileQuery.isLoading}
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit aria-hidden="true" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </FrameHeader>

            <FramePanel className="flex items-start gap-6">
              <div className="relative shrink-0">
                <Avatar className="size-24">
                  <AvatarImage alt={displayName} src={userImage} />
                  <AvatarFallback className="text-lg">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <Button className="absolute -right-2 -bottom-2 rounded-full" size="icon-sm">
                  <UserRoundPen aria-hidden="true" />
                </Button>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="truncate text-2xl font-semibold">{values.name || displayName}</h3>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{values.email || displayEmail}</span>
                  {session?.user?.emailVerified ? (
                    <Badge variant="secondary">
                      <Check aria-hidden="true" className="size-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X aria-hidden="true" className="size-3" />
                      Unverified
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar aria-hidden="true" className="size-4" />
                  Member since{" "}
                  {session?.user?.createdAt
                    ? new Date(session.user.createdAt).getFullYear()
                    : new Date().getFullYear()}
                </div>

                {contacts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {contacts.map((c, idx) => (
                      <ContactLink
                        key={idx}
                        href={c.type === "email" ? `mailto:${c.value}` : c.value}
                        icon={<IconLetter letter={c.type} letterClassName="size-3.5" />}
                      >
                        {c.type === "linkedin" ? "LinkedIn" : c.value.replace(/^https?:\/\//, "")}
                      </ContactLink>
                    ))}
                  </div>
                )}
              </div>
            </FramePanel>

            {isEditing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void form.handleSubmit();
                }}
                className="m-5"
              >
                <FieldSet>
                  <FieldGroup className="grid grid-cols-1 md:grid-cols-2">
                    <form.AppField name="name">
                      {(field) => <field.InputField label="Display Name" />}
                    </form.AppField>

                    <form.AppField name="email">
                      {(field) => <field.InputField type="email" label="Email" />}
                    </form.AppField>
                  </FieldGroup>
                  <FieldGroup>
                    <form.AppField name="contacts" mode="array">
                      {(field) => (
                        <div className="mt-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">Contacts</p>
                            <Button
                              onClick={() => {
                                const used = new Set(
                                  (field.state.value ?? [])
                                    .map((c) => c?.type)
                                    .filter((t): t is (typeof CONTACT_TYPES)[number] => !!t)
                                );
                                const nextType =
                                  CONTACT_TYPES.find((t) => !used.has(t)) ?? CONTACT_TYPES[0];
                                field.pushValue({
                                  type: nextType,
                                  value: "",
                                  icon: ""
                                });
                              }}
                              size="sm"
                            >
                              Add contact
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {field.state.value?.map((_, i) => (
                              <Group
                                key={i}
                                aria-label="Contact entry"
                                className="w-full rounded-lg"
                              >
                                <Group aria-label="Contact fields" className="flex-1">
                                  <form.AppField name={`contacts[${i}].icon`}>
                                    {(subField) => (
                                      <IconPicker
                                        value={subField.state.value}
                                        onValueChange={(icon) => subField.handleChange(icon)}
                                        className="overflow-hidden rounded-lg border border-input"
                                      >
                                        <Button
                                          variant="ghost"
                                          className="size-full justify-start rounded-none border-0 px-3"
                                        >
                                          {subField.state.value ? (
                                            <PickerIconRenderer name={subField.state.value} />
                                          ) : (
                                            "Select icon"
                                          )}
                                        </Button>
                                      </IconPicker>
                                    )}
                                  </form.AppField>

                                  <GroupSeparator />
                                  <form.AppField name={`contacts[${i}].type`}>
                                    {(subField) => {
                                      const items = CONTACT_TYPES.map((t) => {
                                        return {
                                          label: t,
                                          value: t
                                        };
                                      });
                                      return (
                                        <Combobox
                                          value={subField.state.value ?? null}
                                          onValueChange={(val) => {
                                            if (val != null) {
                                              subField.handleChange(val as never);
                                            }
                                          }}
                                          items={items}
                                        >
                                          <ComboboxPrimitive.InputGroup
                                            className="relative max-w-30 rounded-lg border border-input has-disabled:opacity-64"
                                            data-slot="input-control"
                                          >
                                            <ComboboxPrimitive.Input
                                              data-slot="combobox-input"
                                              render={
                                                <Input
                                                  unstyled
                                                  nativeInput
                                                  size="default"
                                                  placeholder="type"
                                                />
                                              }
                                            />
                                            <ComboboxTrigger className="absolute inset-e-0.5 top-1/2 inline-flex size-8 max-w-fit shrink -translate-y-1/2 cursor-pointer items-center justify-center rounded-md opacity-80 transition-opacity outline-none hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4">
                                              <ComboboxPrimitive.Icon data-slot="combobox-icon">
                                                <ChevronsUpDown />
                                              </ComboboxPrimitive.Icon>
                                            </ComboboxTrigger>
                                          </ComboboxPrimitive.InputGroup>
                                          <ComboboxContent>
                                            <ComboboxEmpty>No results found.</ComboboxEmpty>
                                            <ComboboxList>
                                              {(item: (typeof items)[number]) => (
                                                <ComboboxItem key={item.value} value={item.value}>
                                                  {item.label}
                                                </ComboboxItem>
                                              )}
                                            </ComboboxList>
                                          </ComboboxContent>
                                        </Combobox>
                                      );
                                    }}
                                  </form.AppField>

                                  <GroupSeparator />
                                  <form.AppField name={`contacts[${i}].value`}>
                                    {(subField) => (
                                      <Input
                                        value={subField.state.value ?? ""}
                                        className="flex-1"
                                        onChange={(e) => subField.handleChange(e.target.value)}
                                        placeholder="https://github.com/salahmohsen/"
                                      />
                                    )}
                                  </form.AppField>

                                  <GroupSeparator />
                                  <form.AppField name={`contacts[${i}].includedInPortfolio`}>
                                    {(subField) => (
                                      <span
                                        data-slot="input-control"
                                        className="flex items-center justify-center rounded-lg border border-input px-3"
                                      >
                                        <Label>
                                          Portfolio
                                          <Switch
                                            checked={subField.state.value as boolean}
                                            onCheckedChange={(checked) =>
                                              subField.handleChange(checked)
                                            }
                                          />
                                        </Label>
                                      </span>
                                    )}
                                  </form.AppField>
                                </Group>
                                <Group aria-label="Remove contact">
                                  <Button
                                    aria-label="Remove contact"
                                    onClick={() => field.removeValue(i)}
                                    size="icon-sm"
                                    variant="outline"
                                  >
                                    <X aria-hidden="true" />
                                  </Button>
                                </Group>
                              </Group>
                            ))}
                          </div>
                        </div>
                      )}
                    </form.AppField>
                  </FieldGroup>
                </FieldSet>
              </form>
            )}
          </Frame>
        )}
      </form.Subscribe>

      <Frame>
        <FrameHeader>
          <div className="min-w-0">
            <FrameTitle>Public profile name</FrameTitle>
            <FrameDescription>
              Your portfolio is available at this path. Renaming keeps the old name as a redirect
              alias.
            </FrameDescription>
          </div>
        </FrameHeader>

        <FramePanel className="flex flex-col gap-4">
          {currentProfileName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Public path</p>
                <p className="truncate font-mono text-sm text-muted-foreground">{publicPath}</p>
                <p className="truncate text-xs text-muted-foreground">{publicUrl}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button onClick={() => void handleCopyPublicUrl()} size="sm" variant="outline">
                  <Copy aria-hidden="true" />
                  Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={publicUrl} rel="noopener noreferrer" target="_blank" />}
                >
                  <ExternalLink aria-hidden="true" />
                  Open
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading profile name…</p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void renameForm.handleSubmit();
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <renameForm.AppField name="profileName">
                {(field) => (
                  <field.InputField
                    label="Profile name"
                    description="3–30 lowercase letters, numbers, and single hyphens"
                  />
                )}
              </renameForm.AppField>
            </div>
            <renameForm.Subscribe
              selector={(state) => {
                return {
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                  profileName: state.values.profileName
                };
              }}
            >
              {({ canSubmit, isSubmitting, profileName }) => (
                <Button
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    renameMutation.isPending ||
                    profileName === currentProfileName
                  }
                  loading={isSubmitting || renameMutation.isPending}
                  size="sm"
                  type="submit"
                >
                  Rename
                </Button>
              )}
            </renameForm.Subscribe>
          </form>
        </FramePanel>
      </Frame>
    </div>
  );
}
