import { type ReactNode } from "react";

import { type ContactOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ContactIcon } from "@/shared/lib/contact-icon";
import { sortContactsByOrder } from "@/shared/lib/sort-contacts";

import { type GithubProfileQueryResult } from "@/pages/home-page/api/get-github-profile.query";

type SocialItem = {
  key: string;
  title: string;
  handle?: string;
  href: string;
  icon: ReactNode;
};

const SOCIAL_CONTACT_TYPES = new Set<ContactOutput["type"]>([
  "github",
  "linkedin",
  "x",
  "youtube",
  "website",
  "instagram",
  "discord",
  "bluesky",
  "mastodon",
  "telegram"
]);

/**
 * Icon row of public social/contact links inside a screen-line panel.
 */
export function ProfileSocialLinks({
  profile,
  contacts,
  className
}: {
  profile: GithubProfileQueryResult | null | undefined;
  contacts: ContactOutput[];
  className?: string;
}) {
  const items = buildSocialItems({ profile, contacts });

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      data-slot="panel"
      className={cn(
        // Only bottom: ProfileOverview already draws the shared top edge.
        // Pairing top+bottom on adjacent panels stacks two 1px lines into a thicker seam.
        "screen-line-bottom",
        className
      )}
    >
      <h2 className="sr-only">Social Links</h2>
      <div data-slot="panel-body" className="p-4">
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-foreground/80 shadow-none [&_svg:not([class*='size-'])]:size-4.5"
                      render={
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.title}
                        />
                      }
                    />
                  }
                >
                  {item.icon}
                  <span className="sr-only">{item.title}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {item.handle ? `${item.title} (${item.handle})` : item.title}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function buildSocialItems({
  profile,
  contacts
}: {
  profile: GithubProfileQueryResult | null | undefined;
  contacts: ContactOutput[];
}): SocialItem[] {
  const items: SocialItem[] = [];
  const seen = new Set<string>();

  const push = (item: SocialItem) => {
    const key = item.href.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const c of sortContactsByOrder(contacts)) {
    if (!SOCIAL_CONTACT_TYPES.has(c.type)) continue;
    const href = normalizeHref(c.type, c.value);
    if (!href) continue;
    push({
      key: `contact-${c.id}`,
      title: socialTitle(c.type),
      handle: socialHandle(c.type, c.value),
      href,
      icon: <ContactIcon type={c.type} />
    });
  }

  if (profile?.login) {
    push({
      key: "github-profile",
      title: "GitHub",
      handle: `@${profile.login}`,
      href: profile.url || `https://github.com/${profile.login}`,
      icon: <ContactIcon type="github" />
    });
  }

  if (profile?.twitterUsername?.trim()) {
    const handle = profile.twitterUsername.replace(/^@/, "");
    push({
      key: "github-x",
      title: "X",
      handle: `@${handle}`,
      href: `https://x.com/${handle}`,
      icon: <ContactIcon type="x" />
    });
  }

  if (profile?.blog?.trim()) {
    const href = ensureHttp(profile.blog.trim());
    push({
      key: "github-blog",
      title: "Website",
      handle: displayHost(href),
      href,
      icon: <ContactIcon type="website" />
    });
  }

  return items;
}

function normalizeHref(type: ContactOutput["type"], value: string) {
  const v = value.trim();
  if (!v) return null;
  if (type === "email") return `mailto:${v.replace(/^mailto:/i, "")}`;
  if (type === "phone") return `tel:${v.replace(/^tel:/i, "")}`;
  if (type === "x" && !/^https?:\/\//i.test(v) && !v.includes(".")) {
    return `https://x.com/${v.replace(/^@/, "")}`;
  }
  if (type === "github" && !/^https?:\/\//i.test(v) && !v.includes(".")) {
    return `https://github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "linkedin" && !/^https?:\/\//i.test(v)) {
    return v.includes("linkedin.com")
      ? ensureHttp(v)
      : `https://linkedin.com/in/${v.replace(/^@/, "")}`;
  }
  if (type === "instagram" && !/^https?:\/\//i.test(v) && !v.includes(".")) {
    return `https://instagram.com/${v.replace(/^@/, "")}`;
  }
  if (type === "telegram" && !/^https?:\/\//i.test(v)) {
    if (v.startsWith("t.me/")) return ensureHttp(v);
    return `https://t.me/${v.replace(/^@/, "")}`;
  }
  if (type === "bluesky" && !/^https?:\/\//i.test(v)) {
    if (v.includes("bsky.app") || v.includes("bsky.social")) return ensureHttp(v);
    // Handle or DID → profile URL
    const handle = v.replace(/^@/, "");
    return `https://bsky.app/profile/${handle}`;
  }
  if (type === "mastodon" && !/^https?:\/\//i.test(v)) {
    // @user@instance → https://instance/@user
    const atHandle = v.match(/^@?([^@]+)@([^@]+)$/);
    if (atHandle) {
      return `https://${atHandle[2]}/@${atHandle[1]}`;
    }
    return ensureHttp(v);
  }
  if (type === "discord") {
    // Prefer invite / full URLs; bare IDs stay as-is via ensureHttp only when URL-like
    if (/^https?:\/\//i.test(v) || v.includes("discord.gg") || v.includes("discord.com")) {
      return ensureHttp(v);
    }
    if (v.startsWith("discord.gg/")) return ensureHttp(v);
    // Username or snowflake — not linkable without more context
    return ensureHttp(v.includes(".") ? v : `https://discord.com/users/${v}`);
  }
  return ensureHttp(v);
}

function socialTitle(type: string) {
  switch (type) {
    case "x":
      return "X";
    case "github":
      return "GitHub";
    case "linkedin":
      return "LinkedIn";
    case "youtube":
      return "YouTube";
    case "website":
      return "Website";
    case "instagram":
      return "Instagram";
    case "discord":
      return "Discord";
    case "bluesky":
      return "Bluesky";
    case "mastodon":
      return "Mastodon";
    case "telegram":
      return "Telegram";
    default:
      return type;
  }
}

function socialHandle(type: string, value: string) {
  const v = value.trim();
  if (
    type === "x" ||
    type === "github" ||
    type === "instagram" ||
    type === "telegram" ||
    type === "bluesky"
  ) {
    if (!/^https?:\/\//i.test(v)) {
      const bare = v.replace(/^@/, "").replace(/^t\.me\//i, "");
      return bare.startsWith("@") ? bare : `@${bare}`;
    }
    try {
      const path = new URL(ensureHttp(v)).pathname.replace(/\/$/, "");
      const last = path.split("/").filter(Boolean).pop();
      return last ? `@${last.replace(/^@/, "")}` : undefined;
    } catch {
      return undefined;
    }
  }
  if (type === "mastodon") {
    if (!/^https?:\/\//i.test(v)) {
      const bare = v.startsWith("@") ? v : `@${v}`;
      return bare;
    }
    try {
      const url = new URL(ensureHttp(v));
      const user = url.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
      return user ? `${user}@${url.hostname}` : undefined;
    } catch {
      return undefined;
    }
  }
  if (type === "discord") {
    if (!/^https?:\/\//i.test(v) && !v.includes(".")) return v;
    return undefined;
  }
  if (type === "website") {
    try {
      return displayHost(ensureHttp(v));
    } catch {
      return v;
    }
  }
  return undefined;
}

function ensureHttp(value: string) {
  if (/^https?:\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return value;
  }
  return `https://${value}`;
}

function displayHost(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
