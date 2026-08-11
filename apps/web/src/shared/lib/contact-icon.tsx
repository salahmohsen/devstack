import { createElement, type JSX } from "react";
import { type IconType } from "react-icons";
import {
  FaBluesky,
  FaDiscord,
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaLocationDot,
  FaMastodon,
  FaPhone,
  FaTelegram,
  FaXTwitter,
  FaYoutube
} from "react-icons/fa6";

import { type ContactSchemaSelect } from "@tsu-stack/db/types";

export type ContactType = ContactSchemaSelect["type"];

export const CONTACT_TYPE_ICONS = {
  website: FaGlobe,
  email: FaEnvelope,
  phone: FaPhone,
  location: FaLocationDot,
  linkedin: FaLinkedin,
  github: FaGithub,
  x: FaXTwitter,
  youtube: FaYoutube,
  instagram: FaInstagram,
  discord: FaDiscord,
  bluesky: FaBluesky,
  mastodon: FaMastodon,
  telegram: FaTelegram
} as const satisfies Record<ContactType, IconType>;

export function getContactIcon(type: ContactType): IconType {
  return CONTACT_TYPE_ICONS[type];
}

export function ContactIcon({
  type,
  className
}: {
  type: ContactType;
  className?: string;
}): JSX.Element {
  return createElement(getContactIcon(type), {
    className,
    "aria-hidden": true
  });
}
