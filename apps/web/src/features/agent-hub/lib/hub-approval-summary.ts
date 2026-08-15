export type HubApprovalSummary = {
  kind: "approval" | "confirm";
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
};

function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function summarizeHubApproval(
  toolName: string,
  args: Record<string, unknown>
): HubApprovalSummary {
  const name = toolName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "");

  if (name === "generate-apply-package") {
    const id = str(args, "applicationId");
    return {
      kind: "approval",
      title: "Generate apply package",
      body: id
        ? `Create resume and letter drafts for application ${id}.`
        : "Create resume and letter drafts for this application.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  if (name === "accept-apply-package") {
    return {
      kind: "approval",
      title: "Accept apply package",
      body: "Write the resume and cover letter PDFs for this application.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  if (name === "send-apply-outreach") {
    return {
      kind: "confirm",
      title: "Send apply outreach",
      body: "Send the first-apply email with the resume PDF. This marks the application applied.",
      primaryLabel: "Send",
      secondaryLabel: "Don't send"
    };
  }
  if (name === "send-mail-reply") {
    const subject = str(args, "subject");
    return {
      kind: "confirm",
      title: "Send mail reply",
      body: subject ? `Send reply: ${subject}` : "Send this Career Inbox reply.",
      primaryLabel: "Send",
      secondaryLabel: "Don't send"
    };
  }
  if (name === "create-application") {
    const title = str(args, "title");
    const company = str(args, "companyName");
    const who = [title, company].filter(Boolean).join(" at ");
    return {
      kind: "approval",
      title: "Create application",
      body: who ? `Save ${who} to your pipeline.` : "Save this application to your pipeline.",
      primaryLabel: "Approve",
      secondaryLabel: "Decline"
    };
  }
  return {
    kind: "approval",
    title: "Approval required",
    body: "The hub wants to run a tool that has side effects. Review and continue or decline.",
    primaryLabel: "Approve",
    secondaryLabel: "Decline"
  };
}
