import { defineRelationsPart } from "drizzle-orm";

import * as schema from "./index.ts";

export const appRelationPart = defineRelationsPart(schema, (r) => {
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
      user: r.one.user({
        from: r.experience.userId,
        to: r.user.id
      }),
      projects: r.many.project({
        from: r.experience.id,
        to: r.project.experienceId
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.experience.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    },
    portfolioEntry: {
      user: r.one.user({
        from: r.portfolioEntry.userId,
        to: r.user.id
      })
    },
    resume: {
      user: r.one.user({
        from: r.resume.userId,
        to: r.user.id
      })
    },
    project: {
      user: r.one.user({
        from: r.project.userId,
        to: r.user.id
      }),
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
      user: r.one.user({
        from: r.stack.userId,
        to: r.user.id
      }),
      projects: r.many.projectStack({
        from: r.stack.id,
        to: r.projectStack.stackId
      }),
      dependencies: r.many.stackDependency({
        from: r.stack.id,
        to: r.stackDependency.stackId
      }),
      portfolioEntry: r.one.portfolioEntry({
        from: r.stack.portfolioEntryId,
        to: r.portfolioEntry.id
      })
    },
    stackDependency: {
      stack: r.one.stack({
        from: r.stackDependency.stackId,
        to: r.stack.id
      })
    },
    projectStackScan: {
      project: r.one.project({
        from: r.projectStackScan.projectId,
        to: r.project.id
      })
    },
    invite: {
      createdBy: r.one.user({
        from: r.invite.createdByUserId,
        to: r.user.id
      }),
      usedBy: r.one.user({
        from: r.invite.usedByUserId,
        to: r.user.id
      })
    },
    profileSlugAlias: {
      user: r.one.user({
        from: r.profileSlugAlias.userId,
        to: r.user.id
      })
    }
  };
});
