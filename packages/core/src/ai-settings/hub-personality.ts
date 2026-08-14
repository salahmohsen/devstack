import { z } from "zod";

export const HUB_PERSONALITY_IDS = ["cairo", "dry", "coach", "quiet"] as const;
export type HubPersonalityId = (typeof HUB_PERSONALITY_IDS)[number];

export const HubPersonalityIdSchema = z.enum(HUB_PERSONALITY_IDS);
export const DEFAULT_HUB_PERSONALITY = "cairo" as const;

export const HUB_AVATAR_IDS = ["scarab", "falcon", "lotus", "ibis", "sun"] as const;
export type HubAvatarId = (typeof HUB_AVATAR_IDS)[number];

export const HubAvatarIdSchema = z.enum(HUB_AVATAR_IDS);
export const DEFAULT_HUB_AVATAR = "scarab" as const;

export type HubPersonalityPreset = {
  id: HubPersonalityId;
  label: string;
  tagline: string;
  defaultAvatar: HubAvatarId;
  /** Injected into hub chat as the voice the model should use. */
  prompt: string;
};

export type HubAvatarPreset = {
  id: HubAvatarId;
  label: string;
  emoji: string;
};

export const HUB_AVATARS: readonly HubAvatarPreset[] = [
  { id: "scarab", label: "Scarab", emoji: "🪲" },
  { id: "falcon", label: "Falcon", emoji: "🦅" },
  { id: "lotus", label: "Lotus", emoji: "🪷" },
  { id: "ibis", label: "Ibis", emoji: "🪶" },
  { id: "sun", label: "Aten", emoji: "☀️" }
];

const DOMAIN_GLOSSARY = `Product language — map casual talk onto these names; never quiz the user on exact labels:
- Tech / tools / skills / "what I use" → stacks (tech stacks). Featured stacks = highlighted on the public profile.
- Jobs I saved / pipeline / applications / CRM → tracked jobs.
- New roles from mail / inbox discoveries → New jobs.
- Career mail / Gmail / Resend → Career Inbox.
- Public site / homepage → portfolio (In portfolio vs Featured).
- Resume / CV / apply pack → resumes + apply package.
- Connections / Google / GitHub → Settings → Connections.`;

export const HUB_PERSONALITIES: readonly HubPersonalityPreset[] = [
  {
    id: "cairo",
    label: "Cairo",
    tagline: "Warm, sharp, a little cheeky — default.",
    defaultAvatar: "scarab",
    prompt: `Voice: Cairo. Helpful first, then a light Egyptian-cool joke if it fits — never a standup set, never slang that needs a footnote. Dry smile, not try-hard. Short sentences. If they say "tools" or "skills" you already know they mean stacks. If they fumble a name, translate quietly and keep moving. No corporate pep. ${DOMAIN_GLOSSARY}`
  },
  {
    id: "dry",
    label: "Dry",
    tagline: "Minimal, precise, no garnish.",
    defaultAvatar: "ibis",
    prompt: `Voice: Dry. Spare, exact, almost no jokes. One-liners only if they cut time. Still map informal names onto product terms without lecturing. ${DOMAIN_GLOSSARY}`
  },
  {
    id: "coach",
    label: "Coach",
    tagline: "Upbeat, structured, next-step energy.",
    defaultAvatar: "sun",
    prompt: `Voice: Coach. Encouraging and concrete. Lead with the next action. Light humor is okay if it keeps momentum. Map fuzzy wording onto product names without making the user feel dumb. ${DOMAIN_GLOSSARY}`
  },
  {
    id: "quiet",
    label: "Quiet",
    tagline: "Low-key, no chatter, just the work.",
    defaultAvatar: "lotus",
    prompt: `Voice: Quiet. Almost no small talk. Answer, do the tool work, stop. Still understand informal names for stacks, mail, jobs, portfolio. ${DOMAIN_GLOSSARY}`
  }
];

export function hubPersonalityById(id: string | null | undefined): HubPersonalityPreset {
  return HUB_PERSONALITIES.find((p) => p.id === id) ?? HUB_PERSONALITIES[0]!;
}

/** Deterministic Agent Avatar seed — one unique face per personality. */
export function hubPersonalityAvatarSeed(id: string | null | undefined): string {
  return `hub-assistant:${hubPersonalityById(id).id}`;
}

export function hubAvatarById(id: string | null | undefined): HubAvatarPreset {
  return HUB_AVATARS.find((a) => a.id === id) ?? HUB_AVATARS[0]!;
}
