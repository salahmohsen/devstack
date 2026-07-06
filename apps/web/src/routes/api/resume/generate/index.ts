import { createFileRoute } from "@tanstack/react-router";

import {
  toExperienceOutput,
  toProjectOutput,
  toStackOutput
} from "@tsu-stack/api/routers/portfolio.mappers";
import { auth } from "@tsu-stack/auth";
import { createDb, runWithDb } from "@tsu-stack/db";
import {
  contactRepository,
  experienceRepository,
  projectRepository,
  stackRepository,
  userRepository
} from "@tsu-stack/db/repositories";

import { generateResume } from "@/server/resume-service";

export const Route = createFileRoute("/api/resume/generate/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response("Unauthorized", { status: 401 });
        }

        return runWithDb(createDb(), async () => {
          const user = await userRepository.findFirst();
          if (!user) {
            return new Response("No user found", { status: 500 });
          }

          const experiences = await experienceRepository.findAll();
          const filteredExperiences = experiences.filter(
            (e): e is NonNullable<typeof e> => !!e?.portfolioEntryId
          );
          const projects = await projectRepository.findAll();
          const filteredProjects = projects.filter(
            (p): p is NonNullable<typeof p> => !!p?.portfolioEntryId
          );
          const stacks = await stackRepository.findAll();
          const filteredStacks = stacks.filter(
            (s): s is NonNullable<typeof s> => !!s?.portfolioEntryId
          );
          const contacts = await contactRepository.findByUserId(user.id);

          const resume = await generateResume({
            name: user.name ?? "Salah Mohsen",
            contacts,
            experiences: filteredExperiences.map(toExperienceOutput),
            projects: filteredProjects.map(toProjectOutput),
            stacks: filteredStacks.map(toStackOutput)
          });

          return new Response(JSON.stringify(resume), {
            headers: { "content-type": "application/json" }
          });
        });
      }
    }
  }
});
