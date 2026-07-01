import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core/portfolio";

export function useGetProjectsQuery() {
  return useQuery(
    orpcQueryClient.portfolio.projects.list.queryOptions({
      meta: { persist: true } as const
    })
  );
}

export const ProjectsSection = () => {
  const projectsQuery = useGetProjectsQuery();
  const projects = projectsQuery.data ?? [];

  return (
    <ol className="group/list">
      {projects.map((project) => (
        <ProjectsItem key={project.id} project={project} />
      ))}
    </ol>
  );
};

export const ProjectsItem = ({ project }: { project: ProjectOutput }) => {
  const content = (
    <article className="group relative grid grid-cols-8 items-center gap-8 pb-1 transition-all duration-200 ease-in-out md:gap-4 lg:group-hover/list:opacity-50 hover:lg:opacity-100!">
      <aside className="col-span-2 hidden h-full w-full items-center justify-center sm:flex lg:justify-start">
        <div className="relative flex aspect-square h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl text-foreground transition-all duration-200 ease-linear sm:h-20 sm:w-20 lg:group-hover:scale-125 lg:group-hover:bg-accent lg:dark:group-hover:bg-accent lg:dark:group-hover:text-accent-foreground">
          {project.logo && (
            <img
              src={project.logo}
              alt="project logo"
              className="h-full w-full rounded-full object-contain p-3 saturate-0 group-hover:invert-0 group-hover:saturate-100 dark:invert"
            />
          )}
        </div>
      </aside>
      <div className="col-span-8 sm:col-span-6">
        <header className="mb-2 flex flex-col gap-1 font-bold">
          <p className="text-xs font-semibold tracking-wide uppercase">
            {String(project.year)}
            {project.isPresent ? " — current" : ""}
          </p>
          <p className="inline-flex items-center gap-1 font-semibold tracking-widest">
            <span className="tracking-normal">{project.title}</span>
            {project.repos.length > 0 && project.repos[0] && (
              <a
                href={project.repos[0]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${project.title} on GitHub`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-3.5" strokeWidth={2.25} />
              </a>
            )}
          </p>
          <div
            className="font-normal [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-4"
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </header>

        <div className="flex flex-wrap gap-1">
          {project.stacks.map((stack) => (
            <p
              key={stack.id}
              className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium tracking-wide uppercase"
            >
              {stack.icon && (
                <img src={stack.icon} alt={stack.name} className="inline-block h-3.5 w-3.5" />
              )}
              {stack.name}
            </p>
          ))}
        </div>
      </div>
    </article>
  );

  return <li className="mb-12">{content}</li>;
};
