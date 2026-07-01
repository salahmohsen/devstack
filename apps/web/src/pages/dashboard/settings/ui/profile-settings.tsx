import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Edit, Globe, Mail, MapPin, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup, FieldSet } from "@tsu-stack/ui/components/field";
import { Separator } from "@tsu-stack/ui/components/separator";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useAppForm } from "@/shared/form";

import { getProfileQueryOptions, getUpdateProfileMutationOptions } from "@/features/profile";

// Validation schema for the full profile form (identity + contact).
const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  website: z
    .string()
    .trim()
    .url("Website must be a valid URL (e.g. https://example.com)")
    .max(500)
    .or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(320)
    .or(z.literal("")),
  location: z.string().trim().min(1).max(200).or(z.literal(""))
});

export function ProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const profileQuery = useQuery(getProfileQueryOptions());
  const [isEditing, setIsEditing] = useState(false);

  // Single source of truth for the server-side profile values.
  // Used to seed the form when it mounts, when the query refetches,
  // and when the user cancels. Falls back to the session while the
  // profile endpoint is still in flight.
  const serverValues = {
    name: profileQuery.data?.name ?? session?.user?.name ?? "",
    email: profileQuery.data?.email ?? session?.user?.email ?? "",
    website: profileQuery.data?.contact.website ?? "",
    contactEmail: profileQuery.data?.contact.email ?? "",
    location: profileQuery.data?.contact.location ?? ""
  };

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: profileSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await updateMutation.mutateAsync({
          name: value.name.trim(),
          email: value.email.trim(),
          contact: {
            website: value.website.trim(),
            email: value.contactEmail.trim(),
            location: value.location.trim()
          }
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
  const websiteDisplay = profileQuery.data?.contact.website ?? null;
  const contactEmailDisplay = profileQuery.data?.contact.email ?? null;
  const locationDisplay = profileQuery.data?.contact.location ?? null;

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
                {(websiteDisplay ?? contactEmailDisplay ?? locationDisplay) && (
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
                    <FieldGroup className="grid grid-cols-2 gap-4">
                      <form.AppField name="name">
                        {(field) => <field.InputField label="Display Name" />}
                      </form.AppField>

                      <form.AppField name="email">
                        {(field) => <field.InputField type="email" label="Email" />}
                      </form.AppField>

                      <form.AppField name="website">
                        {(field) => (
                          <field.InputField
                            label="Website"
                            placeholder="https://example.com"
                            type="url"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="contactEmail">
                        {(field) => (
                          <field.InputField
                            label="Contact Email"
                            placeholder="hello@example.com"
                            type="email"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="location">
                        {(field) => (
                          <field.InputField label="Location" placeholder="City, Country" />
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
