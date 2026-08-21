/**
 * ATS-friendly download names: candidate first, then company/role.
 * Recruiters' download folders sort by applicant, not "Resume_…".
 */
function compactToken(value: string, max: number): string {
  const words = value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const joined = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "");
  return joined.slice(0, max) || "Item";
}

function dateStamp(at = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function withPdf(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

export function formatTailoredResumeFilename(input: {
  candidateName: string;
  companyName: string;
  roleTitle: string;
  at?: Date;
}): string {
  const name = compactToken(input.candidateName, 32);
  const company = compactToken(input.companyName, 28);
  const role = compactToken(input.roleTitle, 36);
  return withPdf(`${name}_${company}_${role}_${dateStamp(input.at)}`);
}

export function formatTailoredCoverFilename(input: {
  candidateName: string;
  companyName: string;
  roleTitle: string;
  at?: Date;
}): string {
  const name = compactToken(input.candidateName, 32);
  const company = compactToken(input.companyName, 28);
  const role = compactToken(input.roleTitle, 36);
  return withPdf(`${name}_${company}_${role}_Cover_${dateStamp(input.at)}`);
}

export function formatGeneralResumeFilename(input: { candidateName: string; at?: Date }): string {
  return withPdf(`${compactToken(input.candidateName, 40)}_Resume_${dateStamp(input.at)}`);
}

export function resumeListTitle(input: {
  author: "admin" | "agent";
  jobs: ReadonlyArray<{ title: string; companyName: string }>;
}): string {
  const job = input.jobs?.[0];
  if (job?.title.trim()) return job.title.trim();
  return input.author === "admin" ? "General resume" : "Resume";
}
