import { createHash } from "node:crypto";

import { type NormalizedListing } from "@tsu-stack/core";

export type CatalogHashFields = {
  adapterId: string;
  externalId: string;
  listingUrl: string;
  title: string;
  companyName: string;
  location: string | null;
  workMode: string | null;
  skills: readonly string[];
  description: string | null;
};

/** Stable catalog hash — salary/postedAt are not part of the payload. */
export function catalogFieldsHash(fields: CatalogHashFields): string {
  const payload = [
    fields.adapterId,
    fields.externalId,
    fields.listingUrl,
    fields.title,
    fields.companyName,
    fields.location ?? "",
    fields.workMode ?? "",
    fields.skills.join(","),
    fields.description ?? ""
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function listingContentHash(listing: NormalizedListing): string {
  return catalogFieldsHash({
    adapterId: listing.adapterId,
    externalId: listing.externalId,
    listingUrl: listing.listingUrl,
    title: listing.title,
    companyName: listing.companyName,
    location: listing.location,
    workMode: listing.workMode,
    skills: listing.skills,
    description: listing.description
  });
}
