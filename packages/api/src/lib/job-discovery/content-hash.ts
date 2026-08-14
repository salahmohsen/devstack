import { createHash } from "node:crypto";

import { type NormalizedListing } from "@tsu-stack/core";

/** Stable catalog hash — salary/postedAt are not part of the payload. */
export function listingContentHash(listing: NormalizedListing): string {
  const payload = [
    listing.adapterId,
    listing.externalId,
    listing.listingUrl,
    listing.title,
    listing.companyName,
    listing.location ?? "",
    listing.workMode ?? "",
    listing.skills.join(","),
    listing.description ?? ""
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}
