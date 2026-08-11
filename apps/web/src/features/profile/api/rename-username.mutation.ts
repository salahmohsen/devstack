import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { authClient } from "@tsu-stack/auth/react/auth-client";
import { type RenameUsernameInput } from "@tsu-stack/core";

export function getRenameUsernameMutationOptions() {
  return orpcQueryClient.profile.rename.mutationOptions();
}

export function useRenameUsernameMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.profile.rename.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(orpcQueryClient.profile.get.queryOptions().queryKey, data);
        // Session user.username drives path builders and own-profile checks.
        void authClient.getSession();
        toast.success("Username updated");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "USERNAME_TAKEN":
              toast.error(error.message ?? "That username is already taken.");
              return;
            case "USERNAME_INVALID":
              toast.error(
                error.message ??
                  "Invalid username. Use 3–30 lowercase letters, numbers, and single hyphens."
              );
              return;
          }
        }
        toast.error(error instanceof Error ? error.message : "Failed to rename username");
      }
    })
  );
}

export type RenameUsernameMutationResult = Awaited<ReturnType<typeof orpcClient.profile.rename>>;

export type { RenameUsernameInput };
