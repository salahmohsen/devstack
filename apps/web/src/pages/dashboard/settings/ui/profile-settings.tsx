import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { CalendarIcon, CheckIcon, EditIcon, XIcon } from "@tsu-stack/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup, FieldSet } from "@tsu-stack/ui/components/field";
import { Separator } from "@tsu-stack/ui/components/separator";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useAppForm } from "@/shared/form";

// Validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address")
});

export function ProfileSettings() {
  const { data: session } = authClient.useSession();
  const [isEditing, setIsEditing] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? ""
    },
    validators: {
      onChange: profileSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.updateUser({ name: value.name });

        if (session?.user.email !== value.email) {
          const { error } = await authClient.changeEmail({
            newEmail: value.email
          });
          if (error) throw error;
          toast.success("Check your new email to confirm the change");
        } else {
          toast.success("Profile updated successfully");
        }
        setIsEditing(false);
      } catch {
        toast.error("Failed to update profile");
      }
    }
  });

  // Reset form when session changes
  useEffect(() => {
    if (session?.user) {
      form.reset({
        name: session.user.name || "",
        email: session.user.email || ""
      });
    }
  }, [form, session?.user]);

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

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
                  <AvatarImage alt={session?.user?.name} src={session?.user?.image ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {session?.user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  className="absolute -right-2 -bottom-2 size-8 rounded-full p-0"
                  size="sm"
                  type="button"
                >
                  <EditIcon className="size-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-semibold">{values.name || session?.user?.name}</h3>
                </div>
                <div className="flex gap-1">
                  <p className="text-muted-foreground">{values.email || session?.user?.email}</p>
                  {session?.user?.emailVerified ? (
                    <Badge variant="secondary">
                      <CheckIcon className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XIcon className="mr-1 h-3 w-3" />
                      unverified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    Member since{" "}
                    {session?.user?.createdAt
                      ? new Date(session.user.createdAt).getFullYear()
                      : new Date().getFullYear()}
                  </div>
                </div>
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
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </form.Subscribe>
      <Separator />
      {/* Profile Fields */}
      {isEditing ? (
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
            </FieldGroup>
          </FieldSet>
        </form>
      ) : (
        <div className="grid gap-6"></div>
      )}
    </div>
  );
}
