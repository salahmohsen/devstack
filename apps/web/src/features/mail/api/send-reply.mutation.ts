import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { type orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { toastAiError } from "@/shared/lib/toast-ai-error";

export function useSendMailReplyMutation() {
  return useMutation(
    orpcQueryClient.mail.sendReply.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.note ?? "Reply sent");
      },
      onError: (error) => {
        if (isDefinedError(error)) {
          switch (error.code) {
            case "NOT_FOUND":
              toast.error(error.message || "Mail message not found.");
              return;
            case "NOT_CAREER":
              toast.error(error.message || "System notification mail cannot send replies.");
              return;
            case "INVALID_TO":
              toast.error(error.message || "Message has no valid sender address to reply to.");
              return;
            case "MAIL_NOT_CONFIGURED":
              toastAiError(
                error.message || "Configure Resend under Settings → Integrations before sending.",
                {
                  feature: "generic",
                  severity: "hard",
                  action: {
                    label: "Integrations",
                    to: "/dashboard/settings/connections"
                  }
                }
              );
              return;
            case "SEND_FAILED":
              toast.error(error.message || "Could not send the reply.");
              return;
          }
        }

        toast.error(error.message || "Could not send reply");
      }
    })
  );
}

export type SendMailReplyMutationResult = Awaited<ReturnType<typeof orpcClient.mail.sendReply>>;
