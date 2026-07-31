import { describe, expect, it } from "vitest";

import {
  heuristicClassifyMail,
  isJobAlertDigestMail,
  suppressCareerLabelsForJobAlertDigest,
  type MailClassifyInput
} from "#@/mail/classify";
import { proposeMailCrmEffect } from "#@/mail/crm-effects";

function baseInput(overrides: Partial<MailClassifyInput> = {}): MailClassifyInput {
  return {
    messageId: "msg_1",
    userId: "user_1",
    fromName: "",
    fromEmail: "sender@example.com",
    subject: "",
    preview: "",
    bodyText: "",
    labels: [],
    smartRules: [],
    fewShotCorrections: [],
    ...overrides
  };
}

describe("isJobAlertDigestMail", () => {
  it("detects LinkedIn jobalerts-noreply", () => {
    expect(
      isJobAlertDigestMail({
        fromEmail: "jobalerts-noreply@linkedin.com",
        subject: "Your job alerts"
      })
    ).toBe(true);
  });
});

describe("heuristicClassifyMail", () => {
  it("labels LinkedIn jobalerts as job_notifier", () => {
    const result = heuristicClassifyMail(
      baseInput({
        fromEmail: "jobalerts-noreply@linkedin.com",
        fromName: "LinkedIn Job Alerts",
        subject: "12 new jobs for Software Engineer",
        preview: "Your job alert for software engineer in remote"
      })
    );
    expect(result.systemLabels).toEqual(["job_notifier"]);
    expect(result.source).toBe("heuristic");
    expect(result.notes).toMatch(/job_notifier/);
    expect(result.labels).toContain("job_notifier");
  });

  it("labels “application was sent” as application_status", () => {
    const result = heuristicClassifyMail(
      baseInput({
        fromEmail: "jobs-listings@linkedin.com",
        subject: "Your application was sent to Acme",
        preview: "Your application was sent to Acme Corp"
      })
    );
    expect(result.systemLabels).toEqual(["application_status"]);
    expect(result.notes).toMatch(/application_status/);
  });

  it("labels OpenAI product mail as noise", () => {
    const result = heuristicClassifyMail(
      baseInput({
        fromEmail: "noreply@openai.com",
        fromName: "OpenAI",
        subject: "New features in ChatGPT",
        preview: "See what's new in your workspace this week"
      })
    );
    expect(result.systemLabels).toEqual(["noise"]);
    expect(result.notes).toMatch(/noise/);
  });

  it("labels offer letter as offer", () => {
    const result = heuristicClassifyMail(
      baseInput({
        fromEmail: "hr@acme.com",
        subject: "Offer letter — Senior Engineer",
        preview: "We are pleased to offer you the position",
        bodyText: "Please find attached the offer letter and compensation package."
      })
    );
    expect(result.systemLabels).toEqual(["offer"]);
    expect(result.notes).toMatch(/offer/);
  });

  it("does not treat career signals as noise even from product-adjacent domains", () => {
    const result = heuristicClassifyMail(
      baseInput({
        fromEmail: "talent@careers.airbnb.com",
        subject: "Interview loop for Software Engineer",
        preview: "We would like to schedule an interview"
      })
    );
    expect(result.systemLabels).toEqual(["interview"]);
  });
});

describe("suppressCareerLabelsForJobAlertDigest", () => {
  it("forces job_notifier when LLM mislabels a digest as interview", () => {
    const input = baseInput({
      fromEmail: "jobalerts-noreply@linkedin.com",
      subject: "Jobs you may be interested in",
      preview: "Interview roles and more"
    });
    const suppressed = suppressCareerLabelsForJobAlertDigest(input, {
      labels: ["interview"],
      systemLabels: ["interview"],
      source: "llm",
      confidence: 0.8,
      notes: "llm:interview"
    });
    expect(suppressed.systemLabels).toEqual(["job_notifier"]);
    expect(suppressed.labels).toContain("job_notifier");
    expect(suppressed.labels).not.toContain("interview");
  });
});

describe("proposeMailCrmEffect for non-CRM labels", () => {
  it("noops for job_notifier", () => {
    const effect = proposeMailCrmEffect({ systemLabels: ["job_notifier"] });
    expect(effect.kind).toBe("noop");
    expect(effect.reason).toBe("non_crm_system_label");
  });

  it("noops for noise", () => {
    const effect = proposeMailCrmEffect({ systemLabels: ["noise"] });
    expect(effect.kind).toBe("noop");
    expect(effect.reason).toBe("non_crm_system_label");
  });

  it("maps application_status to applied when unlinked", () => {
    const effect = proposeMailCrmEffect({ systemLabels: ["application_status"] });
    expect(effect.kind).toBe("advance_stage");
    expect(effect.targetStage).toBe("applied");
  });
});
