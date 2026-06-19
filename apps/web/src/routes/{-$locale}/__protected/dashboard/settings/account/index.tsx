import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { type DeviceType } from "@tsu-stack/ui/components/auth-session-manager";

import { AccountSettings } from "@/pages/dashboard/settings/ui/account-settings";

type ParsedUserAgent = {
  browser?: string;
  deviceName: string;
  deviceType: DeviceType;
  os?: string;
};

function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return { deviceName: "Unknown device", deviceType: "unknown" };
  }

  let os: string | undefined;
  let deviceName: string;
  let deviceType: DeviceType;

  if (/iPhone/i.test(ua)) {
    os = "iOS";
    deviceName = "iPhone";
    deviceType = "mobile";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    deviceName = "iPad";
    deviceType = "tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    deviceName = "Mac";
    deviceType = "desktop";
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
    deviceName = "Windows PC";
    deviceType = "desktop";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    const modelMatch = ua.match(/Android[^)]*;\s*([^)]+)\)/);
    deviceName = modelMatch?.[1]?.trim() ?? "Android device";
    deviceType = /Mobile/i.test(ua) ? "mobile" : "tablet";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    deviceName = "Linux PC";
    deviceType = "desktop";
  } else {
    deviceName = "Unknown device";
    deviceType = "unknown";
  }

  let browser: string | undefined;
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) {
    browser = "Safari";
  }

  return { browser, deviceName, deviceType, os };
}

export const Route = createFileRoute("/{-$locale}/__protected/dashboard/settings/account/")({
  component: RouteComponent,
  loader: async () => {
    const listSessions = await authClient.listSessions();
    const currentToken = (await authClient.getSession()).data?.session.token;

    return listSessions.data?.map((session) => {
      const parsed = parseUserAgent(session.userAgent);

      return {
        isCurrent: session.token === currentToken,
        browser: parsed.browser,
        deviceName: parsed.deviceName,
        deviceType: parsed.deviceType,
        id: session.token,
        ipAddress: session.ipAddress ?? undefined,
        lastActive: session.updatedAt,
        os: parsed.os
      };
    });
  }
});

function RouteComponent() {
  return <AccountSettings />;
}
