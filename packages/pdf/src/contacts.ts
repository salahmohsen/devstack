import { stripUrl } from "@tsu-stack/core/utils";

import { type PdfContact } from "#@/types";

const TYPE_ORDER = [
  "location",
  "phone",
  "email",
  "website",
  "linkedin",
  "github",
  "x",
  "youtube",
  "instagram",
  "telegram",
  "bluesky",
  "mastodon",
  "discord"
] as const;

const SOCIAL_NETWORK: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  x: "X",
  youtube: "YouTube",
  instagram: "Instagram",
  telegram: "Telegram",
  bluesky: "Bluesky",
  mastodon: "Mastodon"
};

/** RenderCV Bluesky username: domain handle, no leading @. */
const BLUESKY_USERNAME_RE =
  /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

const MASTODON_USERNAME_RE = /^@[^@]+@[^@]+$/;

/** Human-readable contact label for the PDF (no scheme, no www). */
export function displayContact(type: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (type === "email" || type === "phone" || type === "location") return v;

  if (type === "github" && !v.includes(".") && !v.includes("/")) {
    return `github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "linkedin" && !v.includes("linkedin.") && !/^https?:/i.test(v)) {
    const path = v.replace(/^@/, "").replace(/^in\//, "");
    return `linkedin.com/in/${path}`;
  }
  if (type === "x" && !v.includes("x.com") && !v.includes("twitter.") && !/^https?:/i.test(v)) {
    return `x.com/${v.replace(/^@/, "")}`;
  }

  return stripUrl(v);
}

/**
 * Build an href for a contact. Phones use `tel:`; emails `mailto:`.
 */
export function contactHref(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  if (type === "email") {
    const addr = v.replace(/^mailto:/i, "");
    return addr.includes("@") ? `mailto:${addr}` : null;
  }

  if (type === "phone") {
    const num = v.replace(/^tel:/i, "").trim();
    return num ? `tel:${num}` : null;
  }

  if (type === "location") return null;

  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;

  if (type === "linkedin") {
    if (v.includes("linkedin.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.linkedin.com/in/${v.replace(/^@/, "").replace(/^in\//, "")}`;
  }
  if (type === "github") {
    if (v.includes("github.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://github.com/${v.replace(/^@/, "")}`;
  }
  if (type === "x") {
    if (v.includes("x.com") || v.includes("twitter.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://x.com/${v.replace(/^@/, "")}`;
  }
  if (type === "youtube") {
    if (v.includes("youtube.com") || v.includes("youtu.be")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.youtube.com/@${v.replace(/^@/, "")}`;
  }
  if (type === "instagram") {
    if (v.includes("instagram.com")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://www.instagram.com/${v.replace(/^@/, "")}`;
  }
  if (type === "telegram") {
    if (v.includes("t.me") || v.includes("telegram.")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://t.me/${v.replace(/^@/, "")}`;
  }
  if (type === "bluesky") {
    if (v.includes("bsky.app")) {
      return v.startsWith("http") ? v : `https://${v.replace(/^\/\//, "")}`;
    }
    return `https://bsky.app/profile/${v.replace(/^@/, "")}`;
  }
  if (type === "mastodon") {
    if (v.startsWith("http")) return v;
    const m = v.match(/^@?([^@]+)@([^@]+)$/);
    if (m) return `https://${m[2]}/@${m[1]}`;
    return v.includes(".") ? `https://${v.replace(/^\/\//, "")}` : null;
  }
  if (type === "discord") {
    if (v.startsWith("http")) return v;
    if (v.includes("discord.gg") || v.includes("discord.com")) {
      return `https://${v.replace(/^\/\//, "")}`;
    }
    return null;
  }

  if (v.includes(".") || v.includes("/")) {
    return `https://${v.replace(/^\/\//, "")}`;
  }
  return null;
}

export function sortContacts(contacts: PdfContact[]): PdfContact[] {
  const typeRank = (t: string) => {
    const i = (TYPE_ORDER as readonly string[]).indexOf(t);
    return i === -1 ? 100 : i;
  };

  return [...contacts].toSorted((a, b) => {
    const ao = a.sortOrder;
    const bo = b.sortOrder;
    const aHas = typeof ao === "number" && Number.isFinite(ao);
    const bHas = typeof bo === "number" && Number.isFinite(bo);
    if (aHas && bHas && ao !== bo) return ao! - bo!;
    if (aHas !== bHas) return aHas ? -1 : 1;
    return typeRank(a.type) - typeRank(b.type);
  });
}

/** E.164-ish: `+` and 7–15 digits. Matches what RenderCV's PhoneNumber typically accepts. */
export function isValidRenderCvPhone(value: string): boolean {
  const normalized = value
    .trim()
    .replace(/^tel:/i, "")
    .replace(/[()\s.-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

export function isValidRenderCvEmail(value: string): boolean {
  const v = value.trim().replace(/^mailto:/i, "");
  if (!v.includes("@") || /\s/.test(v)) return false;
  const [local, domain] = v.split("@");
  return Boolean(local && domain?.includes("."));
}

/** Prefix https when needed; omit if not a pydantic-style HttpUrl. */
export function toRenderCvHttpUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v)
    ? v
    : v.startsWith("//")
      ? `https:${v}`
      : `https://${v}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export type RenderCvSocial = { network: string; username: string };

function stripAt(value: string): string {
  return value.replace(/^@+/, "");
}

function tryUrl(value: string): URL | null {
  const v = value.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v)
    ? v
    : v.startsWith("//")
      ? `https:${v}`
      : v.includes(".")
        ? `https://${v}`
        : null;
  if (!withScheme) return null;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function hostIs(url: URL, hosts: string[]): boolean {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function parseSocialUsername(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const url = tryUrl(v);

  switch (type) {
    case "github":
      if (url && hostIs(url, ["github.com"])) {
        const user = pathSegments(url)[0];
        return user ? stripAt(decodeURIComponent(user)) : null;
      }
      if (v.includes("/") || v.includes(".")) return null;
      return stripAt(v) || null;

    case "linkedin": {
      if (url && hostIs(url, ["linkedin.com"])) {
        const segs = pathSegments(url);
        const inIdx = segs.indexOf("in");
        if (inIdx >= 0 && segs[inIdx + 1]) return stripAt(decodeURIComponent(segs[inIdx + 1]!));
        return null;
      }
      const handle = stripAt(v.replace(/^in\//, ""));
      return handle && !handle.includes("/") ? handle : null;
    }
    case "x":
      if (url && hostIs(url, ["x.com", "twitter.com"])) {
        const user = pathSegments(url)[0];
        if (!user || ["home", "intent", "share", "i"].includes(user.toLowerCase())) return null;
        return stripAt(decodeURIComponent(user));
      }
      if (v.includes("/") || v.includes(".")) return null;
      return stripAt(v) || null;

    case "youtube": {
      if (url && hostIs(url, ["youtube.com"])) {
        const segs = pathSegments(url);
        if (segs[0]?.startsWith("@")) return stripAt(decodeURIComponent(segs[0]));
        if ((segs[0] === "c" || segs[0] === "user") && segs[1]) {
          return stripAt(decodeURIComponent(segs[1]));
        }
        return null;
      }
      if (v.includes("/") || v.includes(".")) return null;
      const handle = stripAt(v);
      return handle && !handle.startsWith("@") ? handle : null;
    }
    case "instagram":
      if (url && hostIs(url, ["instagram.com"])) {
        const user = pathSegments(url)[0];
        if (!user || ["p", "reel", "stories", "explore"].includes(user.toLowerCase())) return null;
        return stripAt(decodeURIComponent(user));
      }
      if (v.includes("/") || v.includes(".")) return null;
      return stripAt(v) || null;

    case "telegram":
      if (url && hostIs(url, ["t.me", "telegram.me", "telegram.org"])) {
        const user = pathSegments(url)[0];
        if (!user || user.startsWith("+") || user === "s") return null;
        return stripAt(decodeURIComponent(user));
      }
      if (v.includes("/") || v.includes(".")) return null;
      return stripAt(v) || null;

    case "bluesky": {
      let handle = "";
      if (url && hostIs(url, ["bsky.app"])) {
        const segs = pathSegments(url);
        if (segs[0] === "profile" && segs[1]) handle = stripAt(decodeURIComponent(segs[1]));
      } else {
        handle = stripAt(v);
      }
      if (!handle) return null;
      if (!handle.includes(".")) handle = `${handle}.bsky.social`;
      return BLUESKY_USERNAME_RE.test(handle) ? handle : null;
    }
    case "mastodon":
      if (MASTODON_USERNAME_RE.test(v)) return v;
      if (/^[^@\s]+@[^@\s]+$/.test(v)) {
        const withAt = `@${v}`;
        return MASTODON_USERNAME_RE.test(withAt) ? withAt : null;
      }
      if (url) {
        const userSeg = pathSegments(url).find((s) => s.startsWith("@")) ?? pathSegments(url)[0];
        if (!userSeg) return null;
        const username = `@${stripAt(decodeURIComponent(userSeg))}@${url.hostname}`;
        return MASTODON_USERNAME_RE.test(username) ? username : null;
      }
      return null;

    default:
      return null;
  }
}

/** Username from handle/URL. Omit Discord, unknown, and invalid RenderCV usernames. */
export function parseRenderCvSocial(type: string, value: string): RenderCvSocial | null {
  const network = SOCIAL_NETWORK[type];
  if (!network) return null;
  const username = parseSocialUsername(type, value);
  if (!username) return null;
  if (network === "YouTube" && username.startsWith("@")) return null;
  if (network === "Mastodon" && !MASTODON_USERNAME_RE.test(username)) return null;
  if (network === "Bluesky" && !BLUESKY_USERNAME_RE.test(username)) return null;
  return { network, username };
}
