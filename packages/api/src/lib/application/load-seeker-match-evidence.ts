import { buildSeekerMatchEvidence, type SeekerMatchEvidence } from "@tsu-stack/core";
import { experienceRepository, projectRepository, stackRepository } from "@tsu-stack/db";

/** Load compact career-profile evidence for harvest / application match scoring. */
export async function loadSeekerMatchEvidence(userId: string): Promise<SeekerMatchEvidence> {
  const [experiences, stacks, projects] = await Promise.all([
    experienceRepository.findAllByUserId(userId),
    stackRepository.findAllByUserId(userId),
    projectRepository.findAllByUserId(userId)
  ]);

  return buildSeekerMatchEvidence({
    experiences: experiences.map((row) => {return {
      title: row.title,
      organization: row.organization
    }}),
    stacks: stacks.map((row) => {return {
      name: row.name,
      isFeatured: row.isFeatured
    }}),
    projects: projects.map((row) => {
      return {
        title: row.title,
        stacks: (row.stacks ?? []).map((link) => {
          return { name: link.stack?.name ?? null };
        })
      };
    })
  });
}
