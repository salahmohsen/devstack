import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { createCrmApplicationMatcherAgent } from "#@/mastra/agents/crm-application-matcher-agent";
import { createCrmStageAdvisorAgent } from "#@/mastra/agents/crm-stage-advisor-agent";
import { createJobNotifierMailExtractorAgent } from "#@/mastra/agents/job-notifier-mail-extractor-agent";
import { createJobPageExtractorAgent } from "#@/mastra/agents/job-page-extractor-agent";
import { createJobPreferenceMatchScorerAgent } from "#@/mastra/agents/job-preference-match-scorer-agent";
import { createMailClassifierAgent } from "#@/mastra/agents/mail-classifier-agent";
import { createMailReplyAgent } from "#@/mastra/agents/mail-reply-agent";
import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import {
  hubJobUrlImportFeedback,
  hubSupervisorInstructions,
  shouldForceProposeApplicationFromJd
} from "#@/mastra/lib/hub-superpowers-policy";
import {
  createHubInputProcessors,
  createHubOutputProcessors,
  HUB_SUPERVISOR_MAX_STEPS,
  hubSupervisorOnIterationComplete
} from "#@/mastra/processors/hub-processors";
import { acceptApplyPackageTool } from "#@/mastra/tools/accept-apply-package.tool";
import { addApplicationNoteTool } from "#@/mastra/tools/add-application-note.tool";
import { createApplicationTool } from "#@/mastra/tools/create-application.tool";
import { dismissJobTool } from "#@/mastra/tools/dismiss-job.tool";
import { explainApplicationVsPrefsTool } from "#@/mastra/tools/explain-application-vs-prefs.tool";
import { findJobsNowTool } from "#@/mastra/tools/find-jobs-now.tool";
import { generateApplyPackageTool } from "#@/mastra/tools/generate-apply-package.tool";
import { generateMailReplyTool } from "#@/mastra/tools/generate-mail-reply.tool";
import { getApplicationTool } from "#@/mastra/tools/get-application.tool";
import { getCertificationTool } from "#@/mastra/tools/get-certification.tool";
import { getDailyBriefTool, openDailyBriefTool } from "#@/mastra/tools/get-daily-brief.tool";
import { getEducationTool } from "#@/mastra/tools/get-education.tool";
import { getExperienceTool } from "#@/mastra/tools/get-experience.tool";
import { getJobPreferencesTool } from "#@/mastra/tools/get-job-preferences.tool";
import { classifyMailTool, getMailTool } from "#@/mastra/tools/get-mail.tool";
import { getProjectTool } from "#@/mastra/tools/get-project.tool";
import { getResumeTool } from "#@/mastra/tools/get-resume.tool";
import { getSearchBriefTool } from "#@/mastra/tools/get-search-brief.tool";
import { getStackTool } from "#@/mastra/tools/get-stack.tool";
import {
  detectStacksWorkflowTool,
  mailClassifyWorkflowTool,
  mailJobHarvestWorkflowTool,
  mailProcessWorkflowTool,
  organizeStacksWorkflowTool,
  resumeImportWorkflowTool
} from "#@/mastra/tools/hub-background-workflow.tools";
import { listCertificationsTool } from "#@/mastra/tools/list-certifications.tool";
import { listEducationsTool } from "#@/mastra/tools/list-educations.tool";
import { listExperiencesTool } from "#@/mastra/tools/list-experiences.tool";
import { listMailTool, searchMailTool } from "#@/mastra/tools/list-mail.tool";
import { listNewJobsTool } from "#@/mastra/tools/list-new-jobs.tool";
import { listNotificationsTool } from "#@/mastra/tools/list-notifications.tool";
import { listOpenApplicationsTool } from "#@/mastra/tools/list-open-applications.tool";
import { listProjectsTool } from "#@/mastra/tools/list-projects.tool";
import { listResumesTool } from "#@/mastra/tools/list-resumes.tool";
import { listStacksTool } from "#@/mastra/tools/list-stacks.tool";
import { markNotificationReadTool } from "#@/mastra/tools/mark-notification-read.tool";
import { openEntityInspectTool } from "#@/mastra/tools/open-entity-inspect.tool";
import { openSurfaceTool } from "#@/mastra/tools/open-surface.tool";
import { proposeApplicationFromJdTool } from "#@/mastra/tools/propose-application-from-jd.tool";
import { proposeCertificationChangeTool } from "#@/mastra/tools/propose-certification-change.tool";
import { proposeEducationChangeTool } from "#@/mastra/tools/propose-education-change.tool";
import { proposeEvidenceChangeTool } from "#@/mastra/tools/propose-evidence-change.tool";
import { proposeHardPreferenceChangeTool } from "#@/mastra/tools/propose-hard-preference-change.tool";
import {
  proposeApplicationFieldChangeTool,
  proposeBatchGeneratePackagesTool,
  proposeBatchTrackingChangeTool,
  proposeDeleteApplicationTool,
  proposeDeleteNoteTool,
  proposeRefreshFromUrlTool,
  proposeSetOutcomeTool
} from "#@/mastra/tools/propose-hub-crm.tool";
import {
  proposeMailCrmChangeTool,
  proposeNewJobsTriageTool
} from "#@/mastra/tools/propose-new-jobs-triage.tool";
import { restoreApplicationTool } from "#@/mastra/tools/restore-application.tool";
import { searchApplicationsTool } from "#@/mastra/tools/search-applications.tool";
import { searchEvidenceTool } from "#@/mastra/tools/search-evidence.tool";
import { sendApplyOutreachTool } from "#@/mastra/tools/send-apply-outreach.tool";
import { sendMailReplyTool } from "#@/mastra/tools/send-mail-reply.tool";
import { trackJobTool } from "#@/mastra/tools/track-job.tool";
import { updateApplicationStageTool } from "#@/mastra/tools/update-application-stage.tool";
import { upsertSoftJobPreferencesTool } from "#@/mastra/tools/upsert-soft-job-preferences.tool";
import { mailReplyWorkflow } from "#@/mastra/workflows/mail-reply-workflow";

/**
 * Hub capability inventory (product wiring — no weather demo).
 *
 * Superpowers tools: New jobs triage, package generate→accept→send, mail, notifs, openSurface.
 */
export function createHubSupervisor() {
  return new Agent({
    id: "hub-supervisor",
    name: "Hub Supervisor",
    description:
      "Coordinates the personal hub: stacks, resume import, Career Inbox, New jobs triage, apply package, and applications help.",
    instructions: hubSupervisorInstructions(),
    model: byoModelFromRequestContext,
    inputProcessors: createHubInputProcessors(HUB_SUPERVISOR_MAX_STEPS),
    outputProcessors: createHubOutputProcessors(),
    defaultOptions: {
      maxSteps: HUB_SUPERVISOR_MAX_STEPS,
      onIterationComplete: (ctx) => hubSupervisorOnIterationComplete(ctx),
      delegation: {
        onDelegationComplete: (context) => {
          if (
            !shouldForceProposeApplicationFromJd([
              context.primitiveId,
              `agent-${context.primitiveId}`
            ])
          ) {
            return;
          }
          return { feedback: hubJobUrlImportFeedback(true) };
        },
        messageFilter: ({ messages }) => {
          const withoutToolParts = messages.filter((m) => {
            // MastraDBMessage content is `{ parts }`; newer core also types model-message shapes.
            const content = m.content as unknown;
            const parts =
              content && typeof content === "object" && "parts" in content
                ? (content as { parts?: unknown }).parts
                : undefined;
            if (!Array.isArray(parts) || parts.length === 0) return true;
            return !parts.some((p: { type?: string } | null) => p?.type === "tool-invocation");
          });
          return withoutToolParts.slice(-8);
        }
      },
      requireToolApproval: ({ toolName }) =>
        /organizeStacks|detectStacks|resumeImport|mailProcess|mailJobHarvest|mailReply|mailClassify|generate-apply-package|generateApplyPackage|accept-apply-package|acceptApplyPackage|send-apply-outreach|sendApplyOutreach|send-mail-reply|sendMailReply|create-application|createApplication/i.test(
          toolName
        )
    },
    tools: {
      listOpenApplications: listOpenApplicationsTool,
      listNewJobs: listNewJobsTool,
      searchApplications: searchApplicationsTool,
      explainApplicationVsPrefs: explainApplicationVsPrefsTool,
      getApplication: getApplicationTool,
      addApplicationNote: addApplicationNoteTool,
      trackJob: trackJobTool,
      dismissJob: dismissJobTool,
      restoreApplication: restoreApplicationTool,
      updateApplicationStage: updateApplicationStageTool,
      proposeApplicationFieldChange: proposeApplicationFieldChangeTool,
      proposeSetOutcome: proposeSetOutcomeTool,
      proposeDeleteApplication: proposeDeleteApplicationTool,
      proposeDeleteNote: proposeDeleteNoteTool,
      proposeBatchTrackingChange: proposeBatchTrackingChangeTool,
      proposeBatchGeneratePackages: proposeBatchGeneratePackagesTool,
      proposeRefreshFromUrl: proposeRefreshFromUrlTool,
      listExperiences: listExperiencesTool,
      getExperience: getExperienceTool,
      listEducations: listEducationsTool,
      getEducation: getEducationTool,
      proposeEducationChange: proposeEducationChangeTool,
      listCertifications: listCertificationsTool,
      getCertification: getCertificationTool,
      proposeCertificationChange: proposeCertificationChangeTool,
      listProjects: listProjectsTool,
      getProject: getProjectTool,
      listStacks: listStacksTool,
      getStack: getStackTool,
      searchEvidence: searchEvidenceTool,
      proposeEvidenceChange: proposeEvidenceChangeTool,
      listResumes: listResumesTool,
      getResume: getResumeTool,
      getJobPreferences: getJobPreferencesTool,
      getSearchBrief: getSearchBriefTool,
      getDailyBrief: getDailyBriefTool,
      openDailyBrief: openDailyBriefTool,
      upsertSoftJobPreferences: upsertSoftJobPreferencesTool,
      proposeHardPreferenceChange: proposeHardPreferenceChangeTool,
      findJobsNow: findJobsNowTool,
      proposeApplicationFromJd: proposeApplicationFromJdTool,
      proposeNewJobsTriage: proposeNewJobsTriageTool,
      createApplication: createApplicationTool,
      generateApplyPackage: generateApplyPackageTool,
      acceptApplyPackage: acceptApplyPackageTool,
      sendApplyOutreach: sendApplyOutreachTool,
      listMail: listMailTool,
      searchMail: searchMailTool,
      classifyMail: classifyMailTool,
      proposeMailCrmChange: proposeMailCrmChangeTool,
      getMail: getMailTool,
      generateMailReply: generateMailReplyTool,
      sendMailReply: sendMailReplyTool,
      listNotifications: listNotificationsTool,
      markNotificationRead: markNotificationReadTool,
      openSurface: openSurfaceTool,
      openEntityInspect: openEntityInspectTool,
      detectStacksWorkflow: detectStacksWorkflowTool,
      organizeStacksWorkflow: organizeStacksWorkflowTool,
      resumeImportWorkflow: resumeImportWorkflowTool,
      mailProcessWorkflow: mailProcessWorkflowTool,
      mailClassifyWorkflow: mailClassifyWorkflowTool,
      mailJobHarvestWorkflow: mailJobHarvestWorkflowTool
    },
    agents: {
      stackCategorizerAgent: createStackCategorizerAgent(),
      mailClassifierAgent: createMailClassifierAgent(),
      mailReplyAgent: createMailReplyAgent(),
      jobNotifierMailExtractor: createJobNotifierMailExtractorAgent(),
      jobPageExtractor: createJobPageExtractorAgent(),
      jobPreferenceMatchScorer: createJobPreferenceMatchScorerAgent(),
      crmApplicationMatcher: createCrmApplicationMatcherAgent(),
      crmStageAdvisor: createCrmStageAdvisorAgent()
    },
    workflows: {
      mailReplyWorkflow
    },
    memory: new Memory({
      options: {
        lastMessages: 20,
        // `true` defaults to google/gemini-2.5-flash and aborts the stream
        // when GOOGLE_API_KEY is unset (product LLM is Settings BYO only).
        observationalMemory: {
          model: byoModelFromRequestContext
        }
      }
    })
  });
}
