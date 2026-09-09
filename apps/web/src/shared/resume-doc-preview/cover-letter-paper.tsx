"use client";

import { cn } from "@tsu-stack/ui/lib/utils";

import { type CoverLetterModel } from "@/shared/resume-doc-preview/cover-letter-model";
import { EditablePaperField } from "@/shared/resume-doc-preview/editable-paper-field";

export type CoverLetterPaperProps = {
  model: CoverLetterModel;
  /**
   * Commit contract: next full body (paragraphs re-joined with blank lines).
   * Committing an emptied paragraph removes it; the component owns the
   * reassembly so the caller only persists one body string.
   */
  onBodyChange: (nextBody: string) => void;
  className?: string;
};

/**
 * Cover letter paper (apply spec #5): mirrors `cover-letter.template.ts` —
 * centered 25pt name over a `|` contact line, date, company, `Re:` line, then
 * justified XCharter paragraphs. Header fields are derived and read-only;
 * body paragraphs are click-to-edit. No evidence icons, no include switches.
 */
export function CoverLetterPaper({ model, onBodyChange, className }: CoverLetterPaperProps) {
  const paragraphs = model.paragraphs;

  const commitParagraph = (index: number, next: string) => {
    const lines = paragraphs.flatMap((paragraph, i) =>
      i === index ? (next ? [next] : []) : [paragraph.text]
    );
    onBodyChange(lines.join("\n\n"));
  };

  return (
    <div
      data-slot="cover-letter-paper"
      className={cn(
        "rendercv-paper rounded-2xl border border-stone-200 px-7 py-6",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
        className
      )}
    >
      <header>
        <div className="cv-name">{model.name}</div>
        {model.contactLine ? <p className="mt-[0.35cm] text-center">{model.contactLine}</p> : null}
      </header>

      <p className="mt-[0.55cm]">{model.dateLine}</p>

      {model.company ? <p className="mt-[0.45cm]">{model.company}</p> : null}
      {model.roleTitle ? <p className="mt-[0.42cm]">Re: {model.roleTitle}</p> : null}

      <div className="mt-[0.55cm] flex flex-col gap-[0.42cm]">
        {paragraphs.length === 0 ? (
          <p className="text-stone-400 italic">
            <EditablePaperField
              multiline
              allowEmpty
              ariaLabel="Cover letter body"
              value=""
              placeholder="Add a paragraph"
              onCommit={(next) => {
                if (next) onBodyChange(next);
              }}
            />
          </p>
        ) : (
          paragraphs.map((paragraph, index) => (
            <EditablePaperField
              key={paragraph.id}
              multiline
              allowEmpty
              ariaLabel={`Cover letter paragraph ${index + 1}`}
              value={paragraph.text}
              onCommit={(next) => commitParagraph(index, next)}
            />
          ))
        )}
      </div>
    </div>
  );
}
