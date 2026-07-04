import { defineRelationsPart } from "drizzle-orm";

import * as schema from "#@/schema/index";

export const relations = defineRelationsPart(schema, (r) => {
  return {
    githubConfig: {
      user: r.one.user({
        from: r.githubConfig.userId,
        to: r.user.id
      })
    },
    contact: {
      user: r.one.user({
        from: r.contact.userId,
        to: r.user.id
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.contact.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    },
    experience: {
      projects: r.many.project({
        from: r.experience.id,
        to: r.project.experienceId
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.experience.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    },
    portfolioEntry: {},
    project: {
      experience: r.one.experience({
        from: r.project.experienceId,
        to: r.experience.id
      }),
      stacks: r.many.projectStack({
        from: r.project.id,
        to: r.projectStack.projectId
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.project.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    },
    projectStack: {
      project: r.one.project({
        from: r.projectStack.projectId,
        to: r.project.id
      }),
      stack: r.one.stack({
        from: r.projectStack.stackId,
        to: r.stack.id
      })
    },
    stack: {
      projects: r.many.projectStack({
        from: r.stack.id,
        to: r.projectStack.stackId
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.stack.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    }
  };
});
