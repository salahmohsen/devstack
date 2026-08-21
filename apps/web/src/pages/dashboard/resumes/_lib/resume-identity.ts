import { type ResumeAuthor, type ResumeOutput, resumeListTitle } from "@tsu-stack/core";

export function primaryResumeJob(resume: ResumeOutput) {
  return resume.jobs?.[0] ?? null;
}

export function resumeCardTitle(resume: ResumeOutput) {
  return resumeListTitle({ author: resume.author, jobs: resume.jobs ?? [] });
}

/** Blobatar seed: filename (plus id so duplicate names still diverge). */
export function resumeAvatarSeed(resume: ResumeOutput) {
  const filename = resume.filename.trim();
  return filename.length > 0 ? `${filename}:${resume.id}` : resume.id;
}

export function resumeViewHref(resumeId: string) {
  return `/api/resume/download/?id=${resumeId}&view=1`;
}

export function isJobResumeAuthor(author: ResumeAuthor) {
  return author === "agent";
}
