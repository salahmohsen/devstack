import { normalizeJobSkillName } from "#@/application/job-skills";

import { type ApplyPackageDraft } from "./apply-package";

/** Approximate one page of resume body (chars of included bullets + summaries). */
export const APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET = 3_200;
/** Approximate two pages. Never a font-size/margin promise. */
export const APPLY_PACKAGE_TWO_PAGE_CHAR_BUDGET = 6_400;
export const APPLY_PACKAGE_ONE_PAGE_BULLET_BUDGET = 16;
export const APPLY_PACKAGE_TWO_PAGE_BULLET_BUDGET = 32;

export type RankApplyPackageExperience = {
  experienceId: string;
  rewrittenBullets: readonly string[];
  fromDate?: string | null;
  isPresent?: boolean;
  title?: string;
  companyName?: string;
};

export type RankApplyPackageProject = {
  projectId: string;
  rewrittenSummary: string;
  rewrittenBullets?: readonly string[];
  name?: string;
};

export type RankApplyPackageItemsInput = {
  experiences: readonly RankApplyPackageExperience[];
  projects: readonly RankApplyPackageProject[];
  jobSkills: readonly { name: string }[] | readonly string[];
  now?: Date;
};

export type RankApplyPackageItemsResult = {
  rankedExperienceIds: string[];
  rankedProjectIds: string[];
  hideCandidateExperienceIds: string[];
  hideCandidateProjectIds: string[];
};

function skillNames(jobSkills: RankApplyPackageItemsInput["jobSkills"]): string[] {
  return jobSkills.map((skill) => (typeof skill === "string" ? skill : skill.name));
}

function overlapCount(text: string, skills: readonly string[]): number {
  const hay = text.toLowerCase();
  let count = 0;
  for (const skill of skills) {
    const token = normalizeJobSkillName(skill);
    if (token.length < 2) continue;
    if (hay.includes(token)) count += 1;
  }
  return count;
}

function recencyScore(fromDate: string | null | undefined, now: Date): number {
  if (!fromDate?.trim()) return 0;
  const parsed = Date.parse(fromDate);
  if (Number.isNaN(parsed)) return 0;
  const years = Math.max(0, (now.getTime() - parsed) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.max(0, 1 - years / 15);
}

function experienceText(item: RankApplyPackageExperience): string {
  return [item.title, item.companyName, ...item.rewrittenBullets].filter(Boolean).join(" ");
}

function projectText(item: RankApplyPackageProject): string {
  return [item.name, item.rewrittenSummary, ...(item.rewrittenBullets ?? [])]
    .filter(Boolean)
    .join(" ");
}

/**
 * Recency + JD-token overlap. Current roles (`isPresent`) are never hide-candidates.
 * Does not set `include`.
 */
export function rankApplyPackageItems(
  input: RankApplyPackageItemsInput
): RankApplyPackageItemsResult {
  const now = input.now ?? new Date();
  const skills = skillNames(input.jobSkills);

  const scoredExperiences = input.experiences.map((item) => {
    const recency = recencyScore(item.fromDate, now);
    const overlap = overlapCount(experienceText(item), skills);
    const presentBonus = item.isPresent ? 5 : 0;
    return {
      id: item.experienceId,
      isPresent: item.isPresent === true,
      score: recency * 10 + overlap * 3 + presentBonus
    };
  });

  const scoredProjects = input.projects.map((item) => {
    const overlap = overlapCount(projectText(item), skills);
    return {
      id: item.projectId,
      score: overlap * 3
    };
  });

  const rankedExperienceIds = [...scoredExperiences]
    .toSorted((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((item) => item.id);
  const rankedProjectIds = [...scoredProjects]
    .toSorted((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((item) => item.id);

  const hideCandidateExperienceIds = [...scoredExperiences]
    .filter((item) => !item.isPresent)
    .toSorted((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .map((item) => item.id);
  const hideCandidateProjectIds = [...scoredProjects]
    .toSorted((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    .map((item) => item.id);

  return {
    rankedExperienceIds,
    rankedProjectIds,
    hideCandidateExperienceIds,
    hideCandidateProjectIds
  };
}

function includedBodySize(draft: ApplyPackageDraft): { chars: number; bullets: number } {
  let chars =
    (draft.professionalSummary ?? "").trim().length + (draft.headline ?? "").trim().length;
  let bullets = 0;
  for (const exp of draft.experiences) {
    if (!exp.include) continue;
    bullets += exp.rewrittenBullets.length;
    chars += exp.title.length + exp.companyName.length;
    for (const bullet of exp.rewrittenBullets) chars += bullet.length;
  }
  for (const project of draft.projects) {
    if (!project.include) continue;
    chars += project.name.length + project.rewrittenSummary.length;
    const extra = project.rewrittenBullets ?? [];
    bullets += extra.length;
    for (const bullet of extra) chars += bullet.length;
  }
  return { chars, bullets };
}

function overBudget(
  size: { chars: number; bullets: number },
  charBudget: number,
  bulletBudget: number
): boolean {
  return size.chars > charBudget || size.bullets > bulletBudget;
}

export type ApplyPackagePdfIncludeResult = {
  draft: ApplyPackageDraft;
  hiddenExperienceCount: number;
  hiddenProjectCount: number;
  pageBudget: 1 | 2 | null;
};

/**
 * Review **on**: return the draft unchanged (human `include` flags win).
 * Review **off**: hide lowest-ranked whole items until a 1-page, then 2-page, char/bullet budget.
 */
export function resolveApplyPackagePdfDraft(input: {
  draft: ApplyPackageDraft;
  reviewApplyKit: boolean;
  experiences: readonly RankApplyPackageExperience[];
  jobSkills: readonly { name: string }[] | readonly string[];
  now?: Date;
}): ApplyPackagePdfIncludeResult {
  if (input.reviewApplyKit) {
    return {
      draft: input.draft,
      hiddenExperienceCount: 0,
      hiddenProjectCount: 0,
      pageBudget: null
    };
  }

  const recencyById = new Map(input.experiences.map((item) => [item.experienceId, item] as const));
  const rank = rankApplyPackageItems({
    experiences: input.draft.experiences.map((exp) => {
      const live = recencyById.get(exp.experienceId);
      return {
        experienceId: exp.experienceId,
        rewrittenBullets: exp.rewrittenBullets,
        title: exp.title,
        companyName: exp.companyName,
        fromDate: live?.fromDate ?? null,
        isPresent: live?.isPresent ?? false
      };
    }),
    projects: input.draft.projects.map((project) => {
      return {
        projectId: project.projectId,
        rewrittenSummary: project.rewrittenSummary,
        rewrittenBullets: project.rewrittenBullets,
        name: project.name
      };
    }),
    jobSkills: input.jobSkills,
    now: input.now
  });

  const hiddenExperiences = new Set<string>();
  const hiddenProjects = new Set<string>();

  const applyHides = (draft: ApplyPackageDraft): ApplyPackageDraft => {
    return {
      ...draft,
      experiences: draft.experiences.map((exp) =>
        hiddenExperiences.has(exp.experienceId) ? { ...exp, include: false } : exp
      ),
      projects: draft.projects.map((project) =>
        hiddenProjects.has(project.projectId) ? { ...project, include: false } : project
      )
    };
  };

  const hideNext = (): boolean => {
    for (const id of rank.hideCandidateExperienceIds) {
      if (hiddenExperiences.has(id)) continue;
      const row = input.draft.experiences.find((exp) => exp.experienceId === id);
      if (!row?.include) continue;
      hiddenExperiences.add(id);
      return true;
    }
    for (const id of rank.hideCandidateProjectIds) {
      if (hiddenProjects.has(id)) continue;
      const row = input.draft.projects.find((project) => project.projectId === id);
      if (!row?.include) continue;
      hiddenProjects.add(id);
      return true;
    }
    return false;
  };

  let working = input.draft;
  let pageBudget: 1 | 2 = 1;
  while (
    overBudget(
      includedBodySize(working),
      APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET,
      APPLY_PACKAGE_ONE_PAGE_BULLET_BUDGET
    )
  ) {
    if (!hideNext()) break;
    working = applyHides(input.draft);
  }

  if (
    overBudget(
      includedBodySize(working),
      APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET,
      APPLY_PACKAGE_ONE_PAGE_BULLET_BUDGET
    )
  ) {
    pageBudget = 2;
    while (
      overBudget(
        includedBodySize(working),
        APPLY_PACKAGE_TWO_PAGE_CHAR_BUDGET,
        APPLY_PACKAGE_TWO_PAGE_BULLET_BUDGET
      )
    ) {
      if (!hideNext()) break;
      working = applyHides(input.draft);
    }
  }

  return {
    draft: working,
    hiddenExperienceCount: hiddenExperiences.size,
    hiddenProjectCount: hiddenProjects.size,
    pageBudget: hiddenExperiences.size > 0 || hiddenProjects.size > 0 ? pageBudget : 1
  };
}

export function applyPackageResumePrompt(applicationId: string): string {
  return `apply-package:${applicationId}`;
}

export function isApplyPackageResumePrompt(
  prompt: string | null | undefined,
  applicationId: string
): boolean {
  return prompt === applyPackageResumePrompt(applicationId);
}
