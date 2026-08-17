import { useMutation } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

export function useStartNewHubChatMutation() {
  return useMutation(orpcQueryClient.agent.startNewHubChat.mutationOptions());
}
