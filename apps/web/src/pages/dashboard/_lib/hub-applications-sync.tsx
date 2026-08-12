"use client";

import { useInvalidateApplicationsOnHubTools } from "@/pages/dashboard/_lib/use-invalidate-applications-on-hub-tools";

/**
 * Dashboard layout child: keeps application lists/badge in sync with hub tools.
 * Must render under HubChatProvider.
 */
export function HubApplicationsSync() {
  useInvalidateApplicationsOnHubTools();
  return null;
}
