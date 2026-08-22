import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { Button } from "@tsu-stack/ui/components/button";

export function ImpersonationBanner() {
  const navigate = useNavigate();
  const { data } = authClient.useSession();
  const impersonatedBy = data?.session?.impersonatedBy;
  const viewedName = data?.user?.name ?? data?.user?.email ?? "this user";

  if (!impersonatedBy) return null;

  return (
    <output className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2 text-sm">
      <p className="min-w-0 truncate">
        Viewing as <span className="font-medium">{viewedName}</span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void authClient.admin.stopImpersonating().then(({ error }) => {
            if (error) {
              toast.error(error.message ?? "Could not stop impersonating");
              return;
            }
            void navigate({ to: "/dashboard/admin/users" });
            window.location.assign("/dashboard/admin/users");
          });
        }}
      >
        Stop
      </Button>
    </output>
  );
}
