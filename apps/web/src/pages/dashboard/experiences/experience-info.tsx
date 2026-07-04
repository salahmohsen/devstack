import { format } from "date-fns";

import { type ExperienceOutput } from "@tsu-stack/core/portfolio";
import { CardFrame, CardFrameHeader } from "@tsu-stack/ui/components/card.js";
import { FrameDescription, FramePanel, FrameTitle } from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { Separator } from "@tsu-stack/ui/components/separator";

import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ExperienceInfoProps = {
  experience: ExperienceOutput | null;
};

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "dd MMMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "dd MMMM yyyy");
  return `${start} — ${end}`;
}

function safeFormat(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, pattern);
}

export function ExperienceInfo({ experience }: ExperienceInfoProps) {
  if (!experience) return null;

  return (
    <CardFrame className="me-5 mt-px max-h-[calc(100dvh-var(--navbar-height)-10px)]">
      <CardFrameHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <FrameTitle className="text-lg">{experience.title}</FrameTitle>
            <FrameDescription>
              {experience.organization} · {formatRange(experience.fromDate, experience.toDate)}
            </FrameDescription>
          </div>
        </div>
      </CardFrameHeader>
      <FramePanel className="h-full min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea>
          <div className="space-y-4 p-5 text-sm">
            {experience.description ? (
              <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {experience.description}
              </Markdown>
            ) : (
              <p className="text-muted-foreground">No description.</p>
            )}

            {experience.projects.length > 0 ? (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Projects
                  </p>
                  <ul className="space-y-2">
                    {experience.projects.map((project) => (
                      <li key={project.id} className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{project.title}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {project.year}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>
      </FramePanel>
      <ItemsInfoFooter />
    </CardFrame>
  );
}
