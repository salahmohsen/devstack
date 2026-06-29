import { ExternalLink } from "lucide-react";
import { FaGithub, FaLink } from "react-icons/fa";

import { type ProjectOutput } from "@tsu-stack/core/portfolio";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ProjectInfoProps = {
  project: ProjectOutput | null;
};

export function ProjectInfo({ project }: ProjectInfoProps) {
  if (!project) return null;

  const projectLink = `${ENV_WEB_ISOMORPHIC.VITE_WEB_URL.replace(/\/$/, "")}/${project.title}`;

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
          <a
            href={projectLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${project.title}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-4" strokeWidth={2.25} />
          </a>
        </div>
        {project.experienceId ? (
          <p className="mt-1 text-xs text-muted-foreground">Linked to an experience</p>
        ) : null}
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="space-y-4">
          {project.summary ? (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Summary
              </p>
              <Markdown>{project.summary}</Markdown>
            </div>
          ) : null}
          {project.description ? (
            <Markdown>{project.description}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
          {project.repos.length > 0 || project.demoUrl ? (
            <div className="flex flex-wrap gap-1.5">
              {project.repos.map((repo) => (
                <a
                  key={repo}
                  href={repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open repository ${repo}`}
                  className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  <FaGithub className="mr-1 size-3" />
                  {repo.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                </a>
              ))}
              {project.demoUrl ? (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open demo for ${project.title}`}
                  className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  <FaLink className="mr-1 size-3" />
                  Demo
                </a>
              ) : null}
            </div>
          ) : null}
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
