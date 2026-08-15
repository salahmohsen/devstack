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
      }),
      applications: r.many.application({
        from: r.resume.id,
        to: r.application.resumeId
      })
    },
    application: {
      user: r.one.user({
        from: r.application.userId,
        to: r.user.id
      }),
      resume: r.one.resume({
        from: r.application.resumeId,
        to: r.resume.id
      }),
      posting: r.one.jobPosting({
        from: r.application.postingId,
        to: r.jobPosting.id
      }),
      mailMessages: r.many.mailMessage({
        from: r.application.id,
        to: r.mailMessage.applicationId
      })
    },
    jobPosting: {
      applications: r.many.application({
        from: r.jobPosting.id,
        to: r.application.postingId
      })
    },
    mailMessage: {
      user: r.one.user({
        from: r.mailMessage.userId,
        to: r.user.id
      }),
      application: r.one.application({
        from: r.mailMessage.applicationId,
        to: r.application.id
      }),
      attachments: r.many.mailAttachment({
        from: r.mailMessage.id,
        to: r.mailAttachment.messageId
      }),
      crmApplies: r.many.mailCrmApply({
        from: r.mailMessage.id,
        to: r.mailCrmApply.messageId
      })
    },
    mailCrmApply: {
      user: r.one.user({
        from: r.mailCrmApply.userId,
        to: r.user.id
      }),
      message: r.one.mailMessage({
        from: r.mailCrmApply.messageId,
        to: r.mailMessage.id
      }),
      application: r.one.application({
        from: r.mailCrmApply.applicationId,
        to: r.application.id
      })
    },
    appNotification: {
      user: r.one.user({
        from: r.appNotification.userId,
        to: r.user.id
      }),
      message: r.one.mailMessage({
        from: r.appNotification.messageId,
        to: r.mailMessage.id
      }),
      application: r.one.application({
        from: r.appNotification.applicationId,
        to: r.application.id
      })
    },
    mailAttachment: {
      message: r.one.mailMessage({
        from: r.mailAttachment.messageId,
        to: r.mailMessage.id
      }),
      user: r.one.user({
        from: r.mailAttachment.userId,
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
    usernameSlugAlias: {
      user: r.one.user({
        from: r.usernameSlugAlias.userId,
        to: r.user.id
      })
    },
    userCustomDomain: {
      user: r.one.user({
        from: r.userCustomDomain.userId,
        to: r.user.id
      })
    },
    userMailSettings: {
      user: r.one.user({
        from: r.userMailSettings.userId,
        to: r.user.id
      })
    }
  };
});
