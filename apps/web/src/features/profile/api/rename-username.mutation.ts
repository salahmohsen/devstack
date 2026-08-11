import { isDefinedError } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { authClient } from "@tsu-stack/auth/react/auth-client";
import { getAuthUserQueryOptions } from "@tsu-stack/auth/react/tanstack-start/queries";
import { type RenameUsernameInput } from "@tsu-stack/core";

export function getRenameUsernameMutationOptions() {
  return orpcQueryClient.profile.rename.mutationOptions();
}

export function useRenameUsernameMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.profile.rename.mutationOptions({
      onSuccess: async (data) => {
        queryClient.setQueryData(orpcQueryClient.profile.get.queryOptions().queryKey, data);
        // Bypass BA 5m session cookie cache so path builders see the new username.
        await authClient.getSession({
          fetchOptions: {
            query: { disableCookieCache: true }
          }
        });
        await queryClient.invalidateQueries({ queryKey: getAuthUserQueryOptions().queryKey });
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
