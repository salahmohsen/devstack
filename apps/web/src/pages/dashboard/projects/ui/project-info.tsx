import { ExternalLink } from "lucide-react";

import { type ProjectOutput } from "@tsu-stack/core/portfolio";
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

type ProjectInfoProps = {
  project: ProjectOutput | null;
};

export function ProjectInfo({ project }: ProjectInfoProps) {
  if (!project) return null;

  return (
    <Card className="me-5 mt-px flex flex-col pt-0 shadow-none">
      <CardHeader className="shrink-0 bg-accent py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg">{project.title}</CardTitle>
            <CardDescription>
              {project.isPresent ? `${project.year} — Present` : project.year}
            </CardDescription>
          </div>
          {project.repo ? (
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${project.title} on GitHub`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-4" strokeWidth={2.25} />
            </a>
          ) : null}
        </div>
        {project.experienceId ? (
          <p className="mt-1 text-xs text-muted-foreground">Linked to an experience</p>
        ) : null}
      </CardHeader>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="space-y-4">
          {project.description ? (
            <Markdown>{project.description}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
          {project.stacks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {project.stacks.map((stack) => (
                <Badge key={stack.id} variant="secondary">
                  {stack.icon ? (
                    <img
                      src={stack.icon}
                      alt=""
                      className="mr-1 inline-block size-3 rounded object-contain"
                    />
                  ) : null}
                  {stack.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </ScrollArea>
      <ItemsInfoFooter />
    </Card>
  );
}
