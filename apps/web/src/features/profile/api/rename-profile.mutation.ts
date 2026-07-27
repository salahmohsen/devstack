import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type RenameProfileInput } from "@tsu-stack/core";

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

export function getRenameProfileMutationOptions() {
  return orpcQueryClient.profile.rename.mutationOptions();
}

export function useRenameProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation(
    orpcQueryClient.profile.rename.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(orpcQueryClient.profile.get.queryOptions().queryKey, data);
        toast.success("Profile name updated");
      },
      onError: (error) => {
        const code = errorCode(error);
        if (code === "PROFILE_NAME_TAKEN") {
          toast.error(errorMessage(error) ?? "That profile name is already taken.");
          return;
        }
        if (code === "PROFILE_NAME_INVALID") {
          toast.error(
            errorMessage(error) ??
              "Invalid profile name. Use 3–30 lowercase letters, numbers, and single hyphens."
          );
          return;
        }
        toast.error(errorMessage(error) ?? "Failed to rename profile");
      }
    })
  );
}

export type RenameProfileMutationResult = Awaited<ReturnType<typeof orpcClient.profile.rename>>;

export type { RenameProfileInput };
