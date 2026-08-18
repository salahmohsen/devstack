"use client";

import { Link, type NavigateOptions } from "@tanstack/react-router";
import {
  ExternalLink,
  FileTextIcon,
  FolderKanbanIcon,
  LayersIcon,
  LinkIcon,
  SparklesIcon
} from "lucide-react";
import { useState } from "react";

import { parseGithubRepoUrl, stripTrailingSlashes } from "@tsu-stack/core";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@tsu-stack/ui/components/tabs";

import { publicRepoOverviewLocation, type PublicSurface } from "@/shared/lib/public-surface";
import { Icon } from "@/shared/ui/icon";
import { Markdown } from "@/shared/ui/markdown";

import {
  ItemInfoPanel,
  ItemInfoSection,
  ItemInfoSections,
  useDeferredInspectBody
} from "@/widgets/items-page/ui/item-info-panel";
import { PanelEditButton } from "@/widgets/items-page/ui/panel-header-actions";

export type ProjectInfoPanelProject = {
  id?: string;
  title: string;
  year: number;
  isPresent: boolean;
  experienceId: string | null;
  summary: string;
  description: string;
  repos: string[];
  demoUrl: string | null;
  stacks: Array<{ id: string; name: string; icon: string | null }>;
  logo: string | null;
  /** Present on dashboard inspect only — omitted from the public portfolio payload. */
  analysis?: string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
};

function repoPathName(repo: string): string {
  return parseGithubRepoUrl(repo)?.name ?? repo.split("/").at(-1) ?? repo;
}

function repoBadgeLabel(repo: string): string {
  const parsed = parseGithubRepoUrl(repo);
  if (parsed) return `${parsed.owner}/${parsed.name}`;
  return repo.replace(/^https?:\/\/(www\.)?github\.com\//, "");
}

function ProjectOverview({
  project,
  surface
}: {
  project: ProjectInfoPanelProject;
  surface?: PublicSurface;
}) {
  return (
    <ItemInfoSections>
      {project.summary ? (
        <ItemInfoSection title="Summary" icon={<SparklesIcon aria-hidden="true" />}>
          <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            {project.summary}
          </Markdown>
        </ItemInfoSection>
      ) : null}
      <ItemInfoSection title="Description" icon={<FolderKanbanIcon aria-hidden="true" />}>
        {project.description ? (
          <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            {project.description}
          </Markdown>
        ) : (
          <p>No description.</p>
        )}
      </ItemInfoSection>
      {project.repos.length > 0 || project.demoUrl ? (
        <ItemInfoSection title="Links" icon={<LinkIcon aria-hidden="true" />}>
          <div className="flex flex-wrap gap-1.5">
            {project.repos.map((repo) => {
              const name = repoPathName(repo);
              const location = surface
                ? publicRepoOverviewLocation(surface, name)
                : {
                    to: `/repos/${name}` as NavigateOptions["to"],
                    params: undefined
                  };
              return (
                <Badge
                  key={repo}
                  variant="secondary"
                  size="lg"
                  render={
                    <Link
                      to={location.to}
                      params={location.params as never}
                      aria-label={`Open repository ${repoBadgeLabel(repo)}`}
                    >
                      {repoBadgeLabel(repo)}
                    </Link>
                  }
                />
              );
            })}
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
                    Demo
                  </a>
                }
              />
            ) : null}
          </div>
        </ItemInfoSection>
      ) : null}
      {project.stacks.length > 0 ? (
        <ItemInfoSection title="Stack" icon={<LayersIcon aria-hidden="true" />}>
          <div className="flex flex-wrap items-center gap-1.5">
            {project.stacks.slice(0, 8).map((stack) => (
              <Badge key={stack.id} variant="secondary" size="sm">
                {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                {stack.name}
              </Badge>
            ))}
            {project.stacks.length > 8 ? (
              <PreviewCard>
                <PreviewCardTrigger render={<Badge variant="secondary" size="sm" />}>
                  +{project.stacks.length - 8}
                </PreviewCardTrigger>
                <PreviewCardPopup className="flex w-md flex-wrap gap-1 p-1">
                  {project.stacks.slice(8).map((stack) => (
                    <Badge key={stack.id} variant="secondary" size="sm">
                      {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                      {stack.name}
                    </Badge>
                  ))}
                </PreviewCardPopup>
              </PreviewCard>
            ) : null}
          </div>
        </ItemInfoSection>
      ) : null}
    </ItemInfoSections>
  );
}

function ProjectAnalysisPreview({ analysis }: { analysis: string | null }) {
  const text = analysis?.trim() ?? "";
  if (!text) {
    return <p className="text-sm text-muted-foreground">No analysis notes yet.</p>;
  }
  return (
    <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
      {text}
    </Markdown>
  );
}

/**
 * Shared project inspect body — dashboard click and public repo “view project”.
 */
export function ProjectInfoPanel({
  project,
  surface,
  onEdit
}: {
  project: ProjectInfoPanelProject;
  /** When set, repo badges use path vs custom-domain public routes. */
  surface?: PublicSurface;
  /** Dashboard inspect only — omitted on the public profile/repos panel. */
  onEdit?: () => void;
}) {
  const projectLink = `${stripTrailingSlashes(ENV_WEB_ISOMORPHIC.VITE_WEB_URL)}/${project.title}`;
  const showAnalysisTab = project.analysis !== undefined;
  const [tab, setTab] = useState("overview");
  const bodyReady = useDeferredInspectBody();

  const panel = (
    <ItemInfoPanel
      eyebrow={
        project.logo ? (
          <img src={project.logo} alt="" />
        ) : (
          <FolderKanbanIcon strokeWidth={1.75} aria-hidden="true" />
        )
      }
      title={project.title}
      description={
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{project.isPresent ? `${project.year} — Present` : project.year}</span>
          {project.experienceId ? (
            <>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span>Linked to an experience</span>
            </>
          ) : null}
        </p>
      }
      nav={
        showAnalysisTab ? (
          <TabsList variant="underline" className="w-full justify-start">
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="analysis">Analysis</TabsTab>
          </TabsList>
        ) : undefined
      }
      actions={
        <>
          {onEdit ? <PanelEditButton onClick={onEdit} /> : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            render={
              <a
                href={projectLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${project.title}`}
              />
            }
          >
            <ExternalLink strokeWidth={2} aria-hidden="true" />
          </Button>
        </>
      }
      updatedAt={project.updatedAt}
      createdAt={project.createdAt}
    >
      {bodyReady ? (
        showAnalysisTab ? (
          <>
            <TabsPanel value="overview">
              <ProjectOverview project={project} surface={surface} />
            </TabsPanel>
            <TabsPanel value="analysis">
              {tab === "analysis" ? (
                <ItemInfoSection title="Analysis" icon={<FileTextIcon aria-hidden="true" />}>
                  <ProjectAnalysisPreview analysis={project.analysis ?? null} />
                </ItemInfoSection>
              ) : null}
            </TabsPanel>
          </>
        ) : (
          <ProjectOverview project={project} surface={surface} />
        )
      ) : null}
    </ItemInfoPanel>
  );

  if (!showAnalysisTab) return panel;

  return (
    <Tabs
      key={project.id ?? project.title}
      value={tab}
      onValueChange={setTab}
      className="h-full min-h-0 gap-0"
    >
      {panel}
    </Tabs>
  );
}
