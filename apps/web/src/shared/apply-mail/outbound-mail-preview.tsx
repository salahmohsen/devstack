"use client";

import { buildOutreachMailModel } from "@tsu-stack/core";
import { cn } from "@tsu-stack/ui/lib/utils";

import { EditablePaperField } from "@/shared/resume-doc-preview/editable-paper-field";

import { applyMailParagraphEdit } from "./mail-edit";

import "./apply-mail.css";

export type OutboundMailPreviewProps = {
  subject: string;
  bodyText: string;
  senderName: string | null;
  contacts: Array<{ type: string; value: string }>;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (bodyText: string) => void;
  className?: string;
  /** Busy lock — forwarded to every editable field (send window: frozen mail). */
  disabled?: boolean;
};

/**
 * Apply spec #6: the Email pane renders the GENERIC Matte letter (the same
 * `buildOutreachMailModel` the sent HTML consumes) and the rendered mail IS
 * the editor — subject and body paragraphs are click-to-edit on the paper,
 * committing into the draft's outreachSubject/outreachBody. Signature and
 * contacts come from the profile and stay read-only. Structure mirrors
 * packages/email `OutboundApplyEmail` (subject → paragraphs → signature →
 * contacts footer below the card).
 */
export function OutboundMailPreview({
  subject,
  bodyText,
  senderName,
  contacts,
  onSubjectChange,
  onBodyChange,
  className,
  disabled
}: OutboundMailPreviewProps) {
  const mail = buildOutreachMailModel({ subject, bodyText, senderName, contacts });

  const commitParagraph = (index: number, next: string) => {
    onBodyChange(applyMailParagraphEdit(mail.paragraphs, index, next).join("\n\n"));
  };

  return (
    <div data-slot="outbound-mail-preview" className={cn("outbound-mail", className)}>
      <div className="outbound-mail__card">
        <EditablePaperField
          className="outbound-mail__subject"
          ariaLabel="Email subject"
          value={mail.subject}
          placeholder="Subject"
          disabled={disabled}
          onCommit={onSubjectChange}
        />

        <div className="outbound-mail__paragraphs">
          {mail.paragraphs.length === 0 ? (
            <p className="outbound-mail__paragraph">
              <EditablePaperField
                multiline
                allowEmpty
                className="outbound-mail__field"
                ariaLabel="Email body"
                value=""
                placeholder="Write the email body"
                disabled={disabled}
                onCommit={(next) => {
                  if (next) onBodyChange(next);
                }}
              />
            </p>
          ) : (
            mail.paragraphs.map((paragraph, index) => (
              <p key={index} className="outbound-mail__paragraph">
                <EditablePaperField
                  multiline
                  allowEmpty
                  className="outbound-mail__field"
                  ariaLabel={`Email paragraph ${index + 1}`}
                  value={paragraph}
                  disabled={disabled}
                  onCommit={(next) => commitParagraph(index, next)}
                />
              </p>
            ))
          )}
        </div>

        <p className="outbound-mail__signature">
          Warmly,
          <br />
          <span
            className={
              mail.senderName
                ? "outbound-mail__sender"
                : "outbound-mail__sender outbound-mail__sender--muted"
            }
          >
            {mail.senderName || "Your name"}
          </span>
        </p>
      </div>

      {mail.contactLines.length > 0 ? (
        <p className="outbound-mail__contacts">
          {mail.contactLines.map((line, index) => (
            <span key={line.text}>
              {index > 0 ? " · " : ""}
              {line.text}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
