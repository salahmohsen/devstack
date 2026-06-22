import { format } from "date-fns";

import { type ExperienceOutput } from "@tsu-stack/core/portfolio";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { Separator } from "@tsu-stack/ui/components/separator";

import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ExperienceInfoProps = {
  experience: ExperienceOutput | null;
};

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = format(new Date(fromDate), "dd MMMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = format(new Date(toDate), "dd MMMM yyyy");
  return `${start} — ${end}`;
}

export function ExperienceInfo({ experience }: ExperienceInfoProps) {
  if (!experience) return null;

  return (
    <Card className="me-5 mt-px flex flex-col pt-0 shadow-none">
      <CardHeader className="shrink-0 bg-accent py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg">{experience.title}</CardTitle>
            <CardDescription>
              {experience.organization} · {formatRange(experience.fromDate, experience.toDate)}
            </CardDescription>
          </div>
          {experience.isArchived ? <Badge variant="secondary">Archived</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ScrollArea>
          {experience.description ? (
            <Markdown className="prose-sm prose max-w-none text-foreground dark:prose-invert">
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
        </ScrollArea>
      </CardContent>
      <ItemsInfoFooter />
    </Card>
  );
}
