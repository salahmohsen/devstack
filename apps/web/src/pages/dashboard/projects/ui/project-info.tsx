import { Link, type NavigateOptions } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { FaGithub, FaLink } from "react-icons/fa";

import { type ProjectOutput } from "@tsu-stack/core/portfolio";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { Icon } from "@/shared/ui/icon-picker";
import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ProjectInfoProps = {
  project: ProjectOutput | null;
};

export function ProjectInfo({ project }: ProjectInfoProps) {
  if (!project) return null;

  const projectLink = `${ENV_WEB_ISOMORPHIC.VITE_WEB_URL.replace(/\/$/, "")}/${project.title}`;

  return (
    <Frame className="me-5 mt-px h-[calc(100dvh-var(--navbar-height)-10px)]">
      <FrameHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <FrameTitle className="text-lg">{project.title}</FrameTitle>
            <FrameDescription>
              {project.isPresent ? `${project.year} — Present` : project.year}
            </FrameDescription>
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
          <FrameDescription className="text-xs">Linked to an experience</FrameDescription>
        ) : null}
      </FrameHeader>
      <FramePanel className="max-h-fit min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-5">
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
                  <Badge
                    key={repo}
                    variant="secondary"
                    size="lg"
                    render={
                      <Link
                        to={`/repos/${repo.split("/").at(-1)}` as NavigateOptions["to"]}
                        aria-label={`Open repository ${repo}`}
                      >
                        <FaGithub className="mr-1 size-3" />
                        {repo.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                      </Link>
                    }
                  />
                ))}
                {project.demoUrl ? (
                  <Badge
                    variant="secondary"
                    size="lg"
                    render={
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open demo for ${project.title}`}
                      >
                        <FaLink className="mr-1 size-3" />
                        Demo
                      </a>
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {project.stacks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.stacks.map((stack) => (
                  <Badge key={stack.id} variant="secondary" size="lg">
                    {stack.icon ? <Icon nameIcon={stack.icon} /> : null}
                    {stack.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </FramePanel>
      <ItemsInfoFooter />
    </Frame>
  );
}
