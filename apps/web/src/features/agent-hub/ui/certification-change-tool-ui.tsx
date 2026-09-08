"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  CreateCertificationInputSchema,
  UpdateCertificationInputSchema,
  type CertificationOutput,
  type CreateCertificationInput,
  type ProposeCertificationChangeInput,
  type ProposeCertificationChangeOutput,
  type UpdateCertificationInput
} from "@tsu-stack/core";

import {
  isProposeCertificationChangeToolName,
  parseProposeCertificationChangeInput,
  parseProposeCertificationChangeOutput
} from "@/features/agent-hub/lib/hub-tool-names";

import { ProfileChangeToolUI, type ProfileChangeEntityConfig } from "./profile-change-tool-ui";

const CERTIFICATION_CONFIG: ProfileChangeEntityConfig<
  ProposeCertificationChangeInput,
  ProposeCertificationChangeOutput,
  CreateCertificationInput,
  UpdateCertificationInput,
  CertificationOutput
> = {
  toolId: "propose-certification-change",
  isToolName: isProposeCertificationChangeToolName,
  parseInput: parseProposeCertificationChangeInput,
  parseOutput: parseProposeCertificationChangeOutput,
  receipt: (action, id) => {
    return { action, kind: "certification", ...(id ? { id } : {}) };
  },
  rowQueryOptions: (id) => orpcQueryClient.certifications.get.queryOptions({ input: { id } }),
  listQueryKey: () => orpcQueryClient.certifications.list.key(),
  rowQueryKey: (id) => orpcQueryClient.certifications.get.queryKey({ input: { id } }),
  createSchema: CreateCertificationInputSchema,
  updateSchema: UpdateCertificationInputSchema,
  createRow: (data) => orpcClient.certifications.create(data),
  updateRow: (id, data) => orpcClient.certifications.update({ id, data }),
  deleteRow: (id) => orpcClient.certifications.delete({ id }),
  fieldLabels: {
    name: "Name",
    issuer: "Issuer",
    issuedAt: "Issued",
    expiresAt: "Expires",
    credentialUrl: "Credential URL",
    description: "Description"
  },
  rowPrimary: (row) => row.name,
  rowSecondary: (row) => row.issuer,
  renderPatchValue: (key, value) => {
    if (key === "credentialUrl" && typeof value === "string" && value) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {value}
        </a>
      );
    }
    return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  },
  copy: {
    waitingProposal: "Waiting for a certification proposal…",
    savedReceipt: "Saved certification change.",
    deletedReceipt: "Deleted certification.",
    deleteWarning:
      "This certification will be removed from your profile and future generated resumes.",
    titles: {
      create: "Confirm certification",
      update: "Confirm certification change",
      delete: "Confirm certification deletion"
    },
    errors: {
      deleteIdRequired: "Certification id is required to delete",
      writeNotReady: "Certification change is not ready to write",
      updateIdRequired: "Certification id is required to update"
    }
  }
};

export function CertificationChangeToolUI(
  props: ToolCallMessagePartProps<ProposeCertificationChangeInput, ProposeCertificationChangeOutput>
) {
  return <ProfileChangeToolUI config={CERTIFICATION_CONFIG} {...props} />;
}
