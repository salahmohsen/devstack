import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  applyJobAlertDigestGuard,
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

  it("detects Jack and Jill multi-role digests", () => {
    expect(
      isJobAlertDigestMail({
        fromEmail: "jack@jackandjill.ai",
        fromName: "Jack from Jack and Jill",
        subject: "4 new senior frontend roles (Paires, Synapse Analytics, & more)",
        preview:
          "I've just run a fresh sweep of the market and found four new senior roles. New matches for you:"
      })
    ).toBe(true);
  });

  it("detects Jack and Jill single-role pitches", () => {
    expect(
      isJobAlertDigestMail({
        fromEmail: "jack@jackandjill.ai",
        subject: "Standout remote React role ($120k+) + GenAI prototypes in Cairo",
        preview: "found a few high-impact roles that bridge your React expertise"
      })
    ).toBe(true);
  });

  it("does not treat LinkedIn messaging digests as job alerts", () => {
    expect(
      isJobAlertDigestMail({
        fromEmail: "messaging-digest-noreply@linkedin.com",
        subject: "Hatem just messaged you"
      })
    ).toBe(false);
  });

  it("does not treat Jack and Jill onboarding as a digest", () => {
    expect(
      isJobAlertDigestMail({
        fromEmail: "jack@jackandjill.ai",
        subject: "Salah, ready to kick things off?",
        preview: "Hi Salah — good to have you here. I'm Jack, and I'll be doing the heavy lifting"
      })
    ).toBe(false);
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

describe("applyJobAlertDigestGuard", () => {
  it("forces job_notifier when AI mislabels a LinkedIn digest as interview", () => {
    const guarded = applyJobAlertDigestGuard(
      baseInput({
        fromEmail: "jobalerts-noreply@linkedin.com",
        subject: "Jobs you may be interested in",
        preview: "Interview roles and more"
      }),
      {
        labels: ["interview"],
        systemLabels: ["interview"],
        source: "llm",
        confidence: 0.8,
        notes: "llm:interview"
      }
    );
    expect(guarded.systemLabels).toEqual(["job_notifier"]);
    expect(guarded.labels).toContain("job_notifier");
    expect(guarded.notes).toMatch(/guard:job_alert_digest/);
  });

  it("does not override a real offer", () => {
    const guarded = applyJobAlertDigestGuard(
      baseInput({
        fromEmail: "hr@acme.example",
        subject: "Offer letter — Senior Engineer",
        preview: "We are pleased to offer you the position"
      }),
      {
        labels: ["offer"],
        systemLabels: ["offer"],
        source: "llm",
        confidence: 0.9,
        notes: "llm:offer"
      }
    );
    expect(guarded.systemLabels).toEqual(["offer"]);
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
