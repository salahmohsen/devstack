import { useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar, Check, ChevronsUpDown, Edit, FileUp, GripVertical, Mail, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { contactTypeSchema, ProfileUpdateInputSchema } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
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
import { ButtonGroup, Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import { SubmitButton, useAppForm } from "@/shared/form";
import { ContactIcon } from "@/shared/lib/contact-icon";
import { primaryAppUrl } from "@/shared/lib/primary-app-url";
import { sortContactsByOrder } from "@/shared/lib/sort-contacts";
import { FlipSummary } from "@/shared/ui/flip-summary";
import { ProfileAvatarUpload } from "@/shared/ui/profile-avatar-upload";
import { normalizePublicSummary } from "@/shared/ui/public-summary";
import { SortableList } from "@/shared/ui/sortable-list";

import { getPortfolioListQueryKey } from "@/features/portfolio";
import {
  getProfileQueryOptions,
  getUpdateProfileMutationOptions,
  useGetProfileQuery,
  type ProfileUpdateInput
} from "@/features/profile";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";

const CONTACT_TYPES = contactTypeSchema.options;

/** Client-only id for new contacts so SortableList has a stable key before save. */
const TMP_CONTACT_ID_PREFIX = "tmp-";

function isTempContactId(id: string | undefined): boolean {
  return !id || id.startsWith(TMP_CONTACT_ID_PREFIX);
}

type ContactFormRow = NonNullable<ProfileUpdateInput["contacts"]>[number] & { id: string };

function toContactFormRows(contacts: ProfileUpdateInput["contacts"] | undefined): ContactFormRow[] {
  return (contacts ?? []).map((c, index) => {
    return {
      ...c,
      // Preserve server id or prior client tmp id; only mint when missing.
      id: c.id ?? `${TMP_CONTACT_ID_PREFIX}${crypto.randomUUID()}`,
      sortOrder: c.sortOrder ?? index
    };
  });
}

function contactsPayloadForSave(contacts: ProfileUpdateInput["contacts"] | undefined) {
  return (contacts ?? []).map((c, index) => {
    return {
      type: c.type,
      value: c.value,
      includedInPortfolio: c.includedInPortfolio,
      sortOrder: index,
      id: isTempContactId(c.id) ? undefined : c.id
    };
  });
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

export function ProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const profileQuery = useGetProfileQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  const serverValues = {
    name: profileQuery.data?.name ?? session?.user?.name ?? "",
    email: profileQuery.data?.email ?? session?.user?.email ?? "",
    summary:
      profileQuery.data?.summary ??
      (session?.user as { summary?: string | null } | undefined)?.summary ??
      "",
    contacts: toContactFormRows(
      (profileQuery.data?.contacts ?? []).map((c) => {
        return {
          id: c.id,
          type: c.type,
          value: c.value,
          sortOrder: c.sortOrder,
          includedInPortfolio: !!c.portfolioEntryId
        };
      })
    )
  } as ProfileUpdateInput;

  const updateMutation = useMutation({
    ...getUpdateProfileMutationOptions(),
    onSuccess: (data) => {
      queryClient.setQueryData(getProfileQueryOptions().queryKey, data);
      void queryClient.invalidateQueries({
        queryKey: getPortfolioListQueryKey()
      });
      void authClient.getSession();
      form.reset({
        name: data.name,
        email: data.email,
        summary: data.summary ?? "",
        contacts: toContactFormRows(
          (data.contacts ?? []).map((c) => {
            return {
              id: c.id,
              type: c.type,
              value: c.value,
              sortOrder: c.sortOrder,
              includedInPortfolio: !!c.portfolioEntryId
            };
          })
        )
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
          summary: value.summary?.trim() ?? "",
          contacts: contactsPayloadForSave(value.contacts)
        });
        setIsEditing(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update profile");
      }
    }
  });

  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
  const handleAvatarUrlChange = useCallback(
    async (url: string | null) => {
      setIsAvatarUpdating(true);
      try {
        // Avatar-only: Better Auth updateUser refreshes the session cookie.
        const result = await authClient.updateUser({
          image: url?.trim() ? url.trim() : null
        });
        if (result.error) {
          toast.error(result.error.message ?? "Could not update photo");
        } else {
          await authClient.getSession();
          const nextImage = url?.trim() ? url.trim() : null;
          queryClient.setQueryData(getProfileQueryOptions().queryKey, (prev) => {
            if (!prev) return prev;
            return { ...prev, image: nextImage };
          });
          void queryClient.invalidateQueries({
            queryKey: getPortfolioListQueryKey()
          });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update photo");
      }
      setIsAvatarUpdating(false);
    },
    [queryClient]
  );

  const handleCancel = () => {
    form.reset(serverValues);
    setIsEditing(false);
  };

  const handleLeaveDiscard = () => {
    form.reset(serverValues);
    setIsEditing(false);
  };

  const isFormDirty = useStore(form.store, (state) => state.isDirty);
  const isDirty = isEditing && isFormDirty;
  const leaveGuard = useSettingsDirtyGuard(isDirty, {
    onDiscard: handleLeaveDiscard
  });

  const handleSendVerification = async () => {
    const email = session?.user?.email;
    if (!email) {
      toast.error("No email on this session");
      return;
    }
    setSendingVerification(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        // Absolute web URL — relative "/" lands on the API host after verify.
        callbackURL: primaryAppUrl("/dashboard/settings/profile")
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not send verification email");
      } else {
        toast.success("Verification email sent — check your inbox");
      }
    } catch {
      toast.error("Could not send verification email");
    }
    setSendingVerification(false);
  };

  // Prefer profile query (updated immediately on avatar mutation) over session lag.
  const userImage = (profileQuery.data?.image ?? session?.user?.image ?? "").trim() || null;
  const displayName = profileQuery.data?.name ?? session?.user?.name ?? "";
  const displayEmail = profileQuery.data?.email ?? session?.user?.email ?? "";
  const displaySummary =
    profileQuery.data?.summary ??
    (session?.user as { summary?: string | null } | undefined)?.summary ??
    "";
  const contacts = profileQuery.data?.contacts ?? [];
  const emailVerified = !!session?.user?.emailVerified;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {leaveGuard.alertDialog}
      {profileQuery.isError ? (
        <Alert variant="error">
          <AlertTitle>Failed to load profile</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      ) : null}

      <form.Subscribe
        selector={(state) => {
          return {
            isSubmitting: state.isSubmitting
          };
        }}
      >
        {({ isSubmitting }) => (
          <SettingsFrame
            title="Profile"
            description="Manage your personal information and contacts."
            actions={
              <>
                <Button size="sm" variant="ghost" render={<Link to="/dashboard/onboarding" />}>
                  <FileUp aria-hidden="true" />
                  Import from resume
                </Button>
                {isEditing ? (
                  <ButtonGroup>
                    <Button onClick={handleCancel} size="sm" variant="outline">
                      Cancel
                    </Button>
                    <GroupSeparator />
                    <form.AppForm>
                      <SubmitButton
                        type="button"
                        size="sm"
                        actionLabel="Save"
                        isLoading={isSubmitting}
                        onClick={() => void form.handleSubmit()}
                      />
                    </form.AppForm>
                  </ButtonGroup>
                ) : (
                  <Button
                    loading={profileQuery.isLoading}
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="outline"
                    disabled={profileQuery.isError}
                  >
                    <Edit aria-hidden="true" />
                    Edit Profile
                  </Button>
                )}
              </>
            }
          >
            {!isEditing ? (
              <div className="flex items-start gap-6">
                <div className="shrink-0">
                  <ProfileAvatarUpload
                    defaultAvatar={userImage}
                    onAvatarUrlChange={handleAvatarUrlChange}
                    disabled={isAvatarUpdating}
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <h3 className="truncate text-2xl font-semibold">{displayName}</h3>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate">{displayEmail}</span>
                    {emailVerified ? (
                      <Badge variant="secondary">
                        <Check aria-hidden="true" className="size-3" />
                        Verified
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="destructive">
                          <X aria-hidden="true" className="size-3" />
                          Unverified
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          loading={sendingVerification}
                          disabled={sendingVerification || !session?.user?.email}
                          onClick={() => void handleSendVerification()}
                        >
                          <Mail aria-hidden="true" className="size-3.5" />
                          Send verification
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar aria-hidden="true" className="size-4" />
                    Member since{" "}
                    {session?.user?.createdAt
                      ? new Date(session.user.createdAt).getFullYear()
                      : new Date().getFullYear()}
                  </div>

                  {normalizePublicSummary(displaySummary) ? (
                    <FlipSummary summary={displaySummary} className="mt-1" />
                  ) : null}

                  {contacts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {sortContactsByOrder(contacts).map((c) => (
                        <ContactLink
                          key={c.id}
                          href={c.type === "email" ? `mailto:${c.value}` : c.value}
                          icon={<ContactIcon type={c.type} className="size-3.5" />}
                        >
                          {c.type === "linkedin" ? "LinkedIn" : c.value.replace(/^https?:\/\//, "")}
                        </ContactLink>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void form.handleSubmit();
                }}
                className="flex flex-col gap-6"
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
                    <form.AppField name="summary">
                      {(field) => (
                        <field.RichTextField
                          label="Public summary"
                          description="Shown under your profile name on the public profile (not your GitHub bio). Use line breaks so each line can flip one at a time."
                          placeholder="A short blurb about you…"
                        />
                      )}
                    </form.AppField>
                  </FieldGroup>
                  <FieldGroup>
                    <form.AppField name="contacts" mode="array">
                      {(field) => {
                        const rows = toContactFormRows(field.state.value);
                        return (
                          <div className="mt-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">Contacts</p>
                              <Button
                                type="button"
                                onClick={() => {
                                  const used = new Set(
                                    (field.state.value ?? [])
                                      .map((c) => c?.type)
                                      .filter((t): t is (typeof CONTACT_TYPES)[number] => !!t)
                                  );
                                  const nextType =
                                    CONTACT_TYPES.find((t) => !used.has(t)) ?? CONTACT_TYPES[0];
                                  field.pushValue({
                                    id: `${TMP_CONTACT_ID_PREFIX}${crypto.randomUUID()}`,
                                    type: nextType,
                                    value: "",
                                    sortOrder: field.state.value?.length ?? 0
                                  });
                                }}
                                size="sm"
                              >
                                Add contact
                              </Button>
                            </div>
                            <SortableList
                              items={rows}
                              sortable={isEditing}
                              disabled={!isEditing}
                              containerClassName="grid grid-cols-1 gap-3"
                              onReorder={(next) => {
                                field.handleChange(
                                  next.map((c, index) => {
                                    return { ...c, sortOrder: index };
                                  })
                                );
                              }}
                            >
                              {(item, dragHandleProps) => {
                                const i = rows.findIndex((r) => r.id === item.id);
                                if (i < 0) return null;
                                return (
                                  // Single Group: drag → icon → type → value → portfolio → remove
                                  // Nested Groups break seam/radius joining (groupVariants gap for child groups).
                                  <Group
                                    aria-label="Contact entry"
                                    className="w-full min-w-0 items-stretch"
                                  >
                                    {dragHandleProps ? (
                                      <>
                                        <button
                                          type="button"
                                          data-slot="input-control"
                                          aria-label="Drag to reorder contact"
                                          className={cn(
                                            "flex min-h-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-input bg-transparent px-2",
                                            dragHandleProps.className
                                          )}
                                          {...dragHandleProps.attributes}
                                          {...dragHandleProps.listeners}
                                        >
                                          <GripVertical className="size-4" aria-hidden />
                                        </button>
                                        <GroupSeparator />
                                      </>
                                    ) : null}

                                    <form.Subscribe
                                      selector={(state) => state.values.contacts?.[i]?.type}
                                    >
                                      {(type) => (
                                        <span
                                          data-slot="input-control"
                                          className="flex min-h-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-input px-2 text-muted-foreground"
                                          aria-hidden
                                          title={type ?? "contact"}
                                        >
                                          {type ? (
                                            <ContactIcon type={type} className="size-4" />
                                          ) : null}
                                        </span>
                                      )}
                                    </form.Subscribe>

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
                                                {(comboItem: (typeof items)[number]) => (
                                                  <ComboboxItem
                                                    key={comboItem.value}
                                                    value={comboItem.value}
                                                  >
                                                    {comboItem.label}
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
                                          className="min-w-0 flex-1"
                                          data-slot="input-control"
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
                                          className="flex min-h-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-input px-3"
                                        >
                                          <Label className="flex items-center gap-2">
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

                                    <GroupSeparator />
                                    <Button
                                      type="button"
                                      aria-label="Remove contact"
                                      onClick={() => field.removeValue(i)}
                                      size="icon"
                                      variant="destructive"
                                      className="min-h-9 shrink-0 self-stretch rounded-lg"
                                    >
                                      <X aria-hidden="true" />
                                    </Button>
                                  </Group>
                                );
                              }}
                            </SortableList>
                          </div>
                        );
                      }}
                    </form.AppField>
                  </FieldGroup>
                </FieldSet>
              </form>
            )}
          </SettingsFrame>
        )}
      </form.Subscribe>
    </div>
  );
}
