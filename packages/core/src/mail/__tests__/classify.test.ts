import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  heuristicClassifyMail,
  isJobAlertDigestMail,
  suppressCareerLabelsForJobAlertDigest,
  type MailClassifyInput
} from "#@/mail/classify";
import { proposeMailCrmEffect } from "#@/mail/crm-effects";
import { type MailSystemLabel } from "#@/mail/types";

type ClassifyCaseFixture = {
  id: string;
  description: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  preview: string;
  expectedSystemLabels: MailSystemLabel[];
};

/** Redacted subjects/from only — no body PII in git (see design lock eval fixtures). */
const classifyCases = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../__fixtures__/classify-cases.json"),
    "utf8"
  )
) as ClassifyCaseFixture[];

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
  it.each(classifyCases as ClassifyCaseFixture[])(
    "corpus fixture $id: $description → $expectedSystemLabels",
    (fixture) => {
      const result = heuristicClassifyMail(
        baseInput({
          messageId: `fixture_${fixture.id}`,
          fromEmail: fixture.fromEmail,
          fromName: fixture.fromName,
          subject: fixture.subject,
          preview: fixture.preview,
          // No bodyText — fixtures are redacted subjects/from only (no PII bodies).
          bodyText: ""
        })
      );
      expect(result.systemLabels).toEqual(fixture.expectedSystemLabels);
      expect(result.source).toBe("heuristic");
      for (const label of fixture.expectedSystemLabels) {
        expect(result.labels).toContain(label);
        expect(result.notes).toMatch(new RegExp(label));
      }
    }
  );

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
