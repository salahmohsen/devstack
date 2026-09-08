export type EducationRow = {
  id: string;
  school: string;
  degree: string;
  field: string | null;
  location: string | null;
  fromDate: string | null;
  toDate: string | null;
  isPresent: boolean;
  description: string | null;
  gpa: string | null;
};

export type CertificationRow = {
  id: string;
  name: string;
  issuer: string;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialUrl: string | null;
  description: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toEducationRow(value: unknown): EducationRow | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.school !== "string" || typeof value.degree !== "string") return null;
  return {
    id: value.id,
    school: value.school,
    degree: value.degree,
    field: typeof value.field === "string" ? value.field : null,
    location: typeof value.location === "string" ? value.location : null,
    fromDate: typeof value.fromDate === "string" ? value.fromDate : null,
    toDate: typeof value.toDate === "string" ? value.toDate : null,
    isPresent: value.isPresent === true,
    description: typeof value.description === "string" ? value.description : null,
    gpa: typeof value.gpa === "string" ? value.gpa : null
  };
}

function toCertificationRow(value: unknown): CertificationRow | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.name !== "string" || typeof value.issuer !== "string") return null;
  return {
    id: value.id,
    name: value.name,
    issuer: value.issuer,
    issuedAt: typeof value.issuedAt === "string" ? value.issuedAt : null,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
    credentialUrl: typeof value.credentialUrl === "string" ? value.credentialUrl : null,
    description: typeof value.description === "string" ? value.description : null
  };
}

export function parseListEducationsResult(result: unknown): EducationRow[] {
  if (!isRecord(result) || !Array.isArray(result.educations)) return [];
  return result.educations.map(toEducationRow).filter((row) => row !== null);
}

export function parseGetEducationResult(result: unknown): EducationRow[] {
  if (!isRecord(result) || result.found !== true) return [];
  const row = toEducationRow(result.education);
  return row ? [row] : [];
}

export function parseListCertificationsResult(result: unknown): CertificationRow[] {
  if (!isRecord(result) || !Array.isArray(result.certifications)) return [];
  return result.certifications.map(toCertificationRow).filter((row) => row !== null);
}

export function parseGetCertificationResult(result: unknown): CertificationRow[] {
  if (!isRecord(result) || result.found !== true) return [];
  const row = toCertificationRow(result.certification);
  return row ? [row] : [];
}
