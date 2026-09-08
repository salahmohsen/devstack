import { type CertificationOutput } from "@tsu-stack/core";
import { type CertificationSchemaSelect } from "@tsu-stack/db/types";

export function toCertificationOutput(row: CertificationSchemaSelect): CertificationOutput {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    credentialUrl: row.credentialUrl,
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
