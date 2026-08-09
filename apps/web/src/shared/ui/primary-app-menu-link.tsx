import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { MenuLinkItem } from "@tsu-stack/ui/components/menu";

import { isCustomDomainHost, primaryAppUrl } from "@/shared/lib/primary-app-url";
import { getRequestHostname } from "@/shared/lib/request-host";

type PrimaryAppMenuLinkProps = {
  /** Path on the primary app origin, e.g. `/dashboard`. */
  path: string;
  /** Accessible name (also used when rendering absolute `<a>` on custom domains). */
  label: string;
  children: ReactNode;
  shortcut?: ReactNode;
};

/**
 * Menu row that opens a primary-app route (dashboard, settings, …).
 * - Primary host: TanStack `Link` (client navigation).
 * - Custom portfolio domain: absolute `<a href>` to VITE_WEB_URL (dashboard is not served on Host).
 */
export function PrimaryAppMenuLink({ path, label, children, shortcut }: PrimaryAppMenuLinkProps) {
  const onCustomDomain = isCustomDomainHost(getRequestHostname());

  if (onCustomDomain) {
    return (
      <MenuLinkItem render={<a href={primaryAppUrl(path)} aria-label={label} />}>
        {children}
        {shortcut}
      </MenuLinkItem>
    );
  }

  return (
    <MenuLinkItem render={<Link to={path as never} />}>
      {children}
      {shortcut}
    </MenuLinkItem>
  );
}
