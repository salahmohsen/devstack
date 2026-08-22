import { z } from "zod";

import { JobSkillBandSchema } from "#@/application/job-skills";
import {
  ApplicationActivityKindSchema,
  ApplicationOutcomeSchema,
  ApplicationStageSchema,
  ApplicationTrackingStatusSchema,
  EmploymentTypeSchema,
  HiringUrgencySchema
} from "#@/application/types";
import { WorkModeSchema } from "#@/job-preference/types";

const HubGetApplicationSkillSchema = z
  .object({
    name: z.string(),
    band: JobSkillBandSchema
  })
  .strict();

const HubGetApplicationKitSchema = z
  .object({
    resumeId: z.string().nullable(),
    resumeFilename: z.string().nullable(),
    coverLetterBody: z.string().nullable(),
    outreachSubject: z.string().nullable(),
    outreachBody: z.string().nullable(),
    draftExists: z.boolean(),
    recruiterEmail: z.string().nullable(),
    outreachSentAt: z.string().nullable()
  })
  .strict();

const HubGetApplicationActivitySchema = z
  .object({
    id: z.string(),
    kind: ApplicationActivityKindSchema,
    body: z.string().nullable(),
    createdAt: z.string()
  })
  .strict();

const HubGetApplicationLinkedMailSchema = z
  .object({
    id: z.string(),
    subject: z.string(),
    fromName: z.string(),
    fromEmail: z.string(),
    receivedAt: z.string(),
    labels: z.array(z.string())
  })
  .strict();

export const HubGetApplicationRecordSchema = z
  .object({
    id: z.string(),
    companyName: z.string(),
    title: z.string(),
    url: z.string().nullable(),
    applyUrl: z.string().nullable(),
    location: z.string().nullable(),
    workMode: WorkModeSchema.nullable(),
    salaryRange: z.string().nullable(),
    employmentType: EmploymentTypeSchema,
    experienceYearsMin: z.number().int().nullable(),
    trackingStatus: ApplicationTrackingStatusSchema,
    stage: ApplicationStageSchema,
    outcome: ApplicationOutcomeSchema.nullable(),
    hiringUrgency: HiringUrgencySchema,
    matchScore: z.number().int().min(0).max(100).nullable(),
    requiredSkills: z.array(HubGetApplicationSkillSchema),
    preferredSkills: z.array(HubGetApplicationSkillSchema),
    description: z.string().nullable(),
    agentTake: z.string().nullable(),
    kit: HubGetApplicationKitSchema,
    activity: z.array(HubGetApplicationActivitySchema).max(50),
    linkedMails: z.array(HubGetApplicationLinkedMailSchema).max(50)
  })
  .strict();

export const HubGetApplicationOutputSchema = z
  .object({
    found: z.boolean(),
    application: HubGetApplicationRecordSchema.nullable()
  })
  .strict();

export type HubGetApplicationOutput = z.infer<typeof HubGetApplicationOutputSchema>;
export type HubGetApplicationRecord = z.infer<typeof HubGetApplicationRecordSchema>;
