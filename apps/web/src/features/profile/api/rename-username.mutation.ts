import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { authClient } from "@tsu-stack/auth/react/auth-client";
import { type RenameUsernameInput } from "@tsu-stack/core";

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" && message.trim() ? message : undefined;
  }
  return undefined;
}

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
        const code = errorCode(error);
        if (code === "USERNAME_TAKEN" || code === "PROFILE_NAME_TAKEN") {
          toast.error(errorMessage(error) ?? "That username is already taken.");
          return;
        }
        if (code === "USERNAME_INVALID" || code === "PROFILE_NAME_INVALID") {
          toast.error(
            errorMessage(error) ??
              "Invalid username. Use 3–30 lowercase letters, numbers, and single hyphens."
          );
          return;
        }
        toast.error(errorMessage(error) ?? "Failed to rename username");
      }
    })
  );
}

export type RenameUsernameMutationResult = Awaited<ReturnType<typeof orpcClient.profile.rename>>;

export type { RenameUsernameInput };
