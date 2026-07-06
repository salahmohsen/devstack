import { useQuery } from "@tanstack/react-query";
import { VscLinkExternal } from "react-icons/vsc";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ExperienceOutput } from "@tsu-stack/core";

import { useGetPortfolioListQuery } from "@/features/portfolio";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC"
  });
}

function formatDuration(
  fromDate: string | null,
  toDate: string | null,
  isPresent: boolean
): string {
  const from = formatDate(fromDate);
  const to = isPresent ? "current" : toDate ? formatDate(toDate) : "Present";
  return from ? `${from} — ${to}` : to;
}

export const Experience = () => {
  const portfolioQuery = useGetPortfolioListQuery();
  const defaultResumeQuery = useQuery(orpcQueryClient.resume.getDefault.queryOptions());
  const experiences = portfolioQuery.data?.experiences ?? [];
  const defaultResume = defaultResumeQuery.data;

  return (
    <>
      <ol className="group/list">
        {experiences.map((exp) => (
          <ExperienceItem key={exp.id} experience={exp} />
        ))}
      </ol>
      {defaultResume && (
        <div className="mt-10 flex gap-1">
          <a
            href={`/api/resume/download/?id=${defaultResume.id}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-accent"
          >
            Download Resume
            <VscLinkExternal />
          </a>
        </div>
      )}
    </>
  );
};

export const ExperienceItem = ({ experience }: { experience: ExperienceOutput }) => {
  const duration = formatDuration(experience.fromDate, experience.toDate, experience.isPresent);

  return (
    <li className="mb-12">
      <article className="group relative grid scale-100 pb-1 transition-all duration-200 ease-in-out sm:grid-cols-8 sm:gap-8 md:gap-4 lg:group-hover:scale-75 lg:group-hover/list:opacity-50 hover:lg:scale-105! hover:lg:opacity-100!">
        <div className="absolute -inset-4 -z-10 hidden rounded-lg lg:-inset-x-6 lg:block lg:group-hover:border lg:group-hover:bg-transparent lg:group-hover:drop-shadow-lg lg:dark:group-hover:border-border/50 lg:dark:group-hover:bg-surface-1" />
        <header className="z-10 mt-1 text-xs font-semibold tracking-wide uppercase sm:col-span-2">
          {duration}
        </header>
        <div className="z-10 sm:col-span-6">
          <h3 className="mb-2 inline-flex items-baseline gap-2 leading-tight font-medium">
            {experience.title && <span className="font-bold">{experience.title}</span>}
            {experience.organization && experience.title && <span>•</span>}
            <span className="font-bold">{experience.organization}</span>
          </h3>
          <div
            className="z-10 flex flex-col gap-2 text-sm leading-normal font-normal [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-4"
            dangerouslySetInnerHTML={{ __html: experience.description }}
          />
        </div>
      </article>
    </li>
  );
};
