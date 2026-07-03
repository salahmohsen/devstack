import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Calendar,
  Check,
  Edit,
  ExternalLink,
  GitBranch,
  Globe,
  Mail,
  MapPin,
  Play,
  X
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { contactTypeSchema, ProfileUpdateInputSchema } from "@tsu-stack/core/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup, FieldSet } from "@tsu-stack/ui/components/field";
import { Separator } from "@tsu-stack/ui/components/separator";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useAppForm } from "@/shared/form";

import {
  getProfileQueryOptions,
  getUpdateProfileMutationOptions,
  type ProfileUpdateInput
} from "@/features/profile";

const CONTACT_TYPES = contactTypeSchema.options;

export function ProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const profileQuery = useQuery(getProfileQueryOptions());
  const [isEditing, setIsEditing] = useState(false);

  const serverValues = {
    name: profileQuery.data?.name ?? session?.user?.name ?? "",
    email: profileQuery.data?.email ?? session?.user?.email ?? "",
    contacts: profileQuery.data?.contacts ?? [{ icon: "", type: "", value: "" }]
  } as ProfileUpdateInput;

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: ProfileUpdateInputSchema
    },
    onSubmit: async ({ value }) => {
      try {
        const contacts = value.contacts?.filter((c) => c.value.trim().length > 0);

        await updateMutation.mutateAsync({
          name: value.name.trim(),
          email: value.email.trim(),
          contacts
        });
        setIsEditing(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update profile");
      }
    }
  });

  const updateMutation = useMutation({
    ...getUpdateProfileMutationOptions(),
    onSuccess: (data) => {
      queryClient.setQueryData(getProfileQueryOptions().queryKey, data);
      toast.success("Profile updated successfully");
    }
  });

  const handleCancel = () => {
    form.reset(serverValues);
    setIsEditing(false);
  };

  const userImage = session?.user?.image ?? undefined;
  const displayName = profileQuery.data?.name ?? session?.user?.name ?? "";
  const displayEmail = profileQuery.data?.email ?? session?.user?.email ?? "";
  const websiteDisplay =
    profileQuery.data?.contacts.find((c) => c.type === "website")?.value ?? null;
  const contactEmailDisplay =
    profileQuery.data?.contacts.find((c) => c.type === "email")?.value ?? null;
  const locationDisplay =
    profileQuery.data?.contacts.find((c) => c.type === "location")?.value ?? null;
  const linkedinDisplay =
    profileQuery.data?.contacts.find((c) => c.type === "linkedin")?.value ?? null;
  const githubDisplay = profileQuery.data?.contacts.find((c) => c.type === "github")?.value ?? null;
  const twitterDisplay = profileQuery.data?.contacts.find((c) => c.type === "x")?.value ?? null;
  const youtubeDisplay =
    profileQuery.data?.contacts.find((c) => c.type === "youtube")?.value ?? null;

  return (
    <div className="space-y-6">
      <form.Subscribe
        selector={(state) => {
          return {
            values: state.values,
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting
          };
        }}
      >
        {({ values, canSubmit, isSubmitting }) => (
          <>
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage alt={displayName} src={userImage} />
                  <AvatarFallback className="text-lg">
                    {displayName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  className="absolute -right-2 -bottom-2 size-8 rounded-full p-0"
                  size="sm"
                  type="button"
                >
                  <Edit className="size-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-semibold">{values.name || displayName}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span>{values.email || displayEmail}</span>
                  {session?.user?.emailVerified ? (
                    <Badge variant="secondary">
                      <Check className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="mr-1 h-3 w-3" />
                      unverified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Member since{" "}
                    {session?.user?.createdAt
                      ? new Date(session.user.createdAt).getFullYear()
                      : new Date().getFullYear()}
                  </div>
                </div>
                {(websiteDisplay ??
                  contactEmailDisplay ??
                  locationDisplay ??
                  linkedinDisplay ??
                  githubDisplay ??
                  twitterDisplay ??
                  youtubeDisplay) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                    {websiteDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={websiteDisplay}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {websiteDisplay.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                    {contactEmailDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={`mailto:${contactEmailDisplay}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {contactEmailDisplay}
                      </a>
                    ) : null}
                    {locationDisplay ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {locationDisplay}
                      </span>
                    ) : null}
                    {linkedinDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={linkedinDisplay}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    ) : null}
                    {githubDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={githubDisplay}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        {githubDisplay.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                    {twitterDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={twitterDisplay}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <AtSign className="h-3.5 w-3.5" />
                        {twitterDisplay.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                    {youtubeDisplay ? (
                      <a
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        href={youtubeDisplay}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {youtubeDisplay.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      disabled={!canSubmit || isSubmitting}
                      onClick={() => {
                        void form.handleSubmit();
                      }}
                      size="sm"
                      type="button"
                    >
                      {isSubmitting ? <Spinner /> : "Save Changes"}
                    </Button>
                    <Button onClick={handleCancel} size="sm" type="button" variant="outline">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={profileQuery.isLoading}
                  >
                    {profileQuery.isLoading ? <Spinner /> : <Edit />}
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <>
                <Separator />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void form.handleSubmit();
                  }}
                >
                  <FieldSet>
                    <FieldGroup>
                      <div className="grid grid-cols-2 gap-4">
                        <form.AppField name="name">
                          {(field) => <field.InputField label="Display Name" />}
                        </form.AppField>

                        <form.AppField name="email">
                          {(field) => <field.InputField type="email" label="Email" />}
                        </form.AppField>
                      </div>

                      <form.AppField name="contacts" mode="array">
                        {(field) => (
                          <div className="space-y-4">
                            <div className="flex w-full items-center justify-between pt-2">
                              <p className="text-sm font-medium text-foreground">Contact</p>
                              <Button
                                onClick={() =>
                                  field.pushValue({ type: "email", value: "", icon: "" })
                                }
                              >
                                add contact
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                              {field.state.value?.map((_, i) => (
                                <div
                                  key={i}
                                  className="grid grid-cols-6 gap-3 rounded-sm border p-5"
                                >
                                  <form.AppField name={`contacts[${i}].icon`}>
                                    {(subField) => (
                                      <subField.IconPickerField
                                        classNames={{
                                          field: "col-span-1"
                                        }}
                                        label="Icon"
                                      />
                                    )}
                                  </form.AppField>

                                  <form.AppField name={`contacts[${i}].type`}>
                                    {(subField) => (
                                      <subField.ComboboxField
                                        label={"Type"}
                                        items={CONTACT_TYPES.map((t) => {
                                          return { label: t, value: t };
                                        })}
                                        classNames={{
                                          field: "col-span-1"
                                        }}
                                      />
                                    )}
                                  </form.AppField>

                                  <form.AppField name={`contacts[${i}].value`}>
                                    {(subField) => (
                                      <subField.InputField
                                        classNames={{ field: "col-span-3" }}
                                        label={"Name"}
                                      />
                                    )}
                                  </form.AppField>

                                  <Button
                                    className="col-span-1 h-9 self-end"
                                    onClick={() => field.removeValue(i)}
                                    size="sm"
                                    type="button"
                                    variant="destructive"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </form.AppField>
                    </FieldGroup>
                  </FieldSet>
                </form>
              </>
            )}
          </>
        )}
      </form.Subscribe>
    </div>
  );
}
