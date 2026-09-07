"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateEducationInputSchema,
  UpdateEducationInputSchema,
  type CreateEducationInput,
  type EducationOutput,
  type ProposeEducationChangeInput,
  type ProposeEducationChangeOutput,
  type UpdateEducationInput
} from "@tsu-stack/core";

import {
  isProposeEducationChangeToolName,
  parseProposeEducationChangeInput,
  parseProposeEducationChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

import { ProfileChangeToolUI, type ProfileChangeEntityConfig } from "./profile-change-tool-ui";

const EDUCATION_CONFIG: ProfileChangeEntityConfig<
  ProposeEducationChangeInput,
  ProposeEducationChangeOutput,
  CreateEducationInput,
  UpdateEducationInput,
  EducationOutput
> = {
  toolId: "propose-education-change",
  isToolName: isProposeEducationChangeToolName,
  parseInput: parseProposeEducationChangeInput,
  parseOutput: parseProposeEducationChangeOutput,
  receipt: (action, id) => {
    return { action, kind: "education", ...(id ? { id } : {}) };
  },
  rowQueryOptions: (id) => orpcQueryClient.educations.get.queryOptions({ input: { id } }),
  listQueryKey: () => orpcQueryClient.educations.list.key(),
  rowQueryKey: (id) => orpcQueryClient.educations.get.queryKey({ input: { id } }),
  createSchema: CreateEducationInputSchema,
  updateSchema: UpdateEducationInputSchema,
  createRow: (data) => orpcClient.educations.create(data),
  updateRow: (id, data) => orpcClient.educations.update({ id, data }),
  deleteRow: (id) => orpcClient.educations.delete({ id }),
  fieldLabels: {
    school: "School",
    degree: "Degree",
    field: "Field",
    location: "Location",
    fromDate: "From",
    toDate: "To",
    isPresent: "Currently enrolled",
    description: "Description",
    gpa: "GPA"
  },
  rowPrimary: (row) => row.school,
  rowSecondary: (row) => row.degree,
  copy: {
    waitingProposal: "Waiting for an education proposal…",
    savedReceipt: "Saved education change.",
    deletedReceipt: "Deleted education entry.",
    deleteWarning:
      "This education entry will be removed from your profile and future generated resumes.",
    titles: {
      create: "Confirm education entry",
      update: "Confirm education change",
      delete: "Confirm education deletion"
    },
    errors: {
      deleteIdRequired: "Education id is required to delete",
      writeNotReady: "Education change is not ready to write",
      updateIdRequired: "Education id is required to update"
    }
  }
};

export function EducationChangeToolUI(
  props: ToolCallMessagePartProps<ProposeEducationChangeInput, ProposeEducationChangeOutput>
) {
  return <ProfileChangeToolUI config={EDUCATION_CONFIG} {...props} />;
}
