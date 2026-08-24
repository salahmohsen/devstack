import { DownloadIcon } from "lucide-react";

import { sanitizeHtml, type ExperiencePublicOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useGetDefaultResumeQuery, useGetPortfolioListQuery } from "@/features/portfolio";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC"
  });
}

/** Full range — single line on the leading edge. */
function formatDuration(
  fromDate: string | null,
  toDate: string | null,
  isPresent: boolean
): string {
  const from = formatDate(fromDate);
  const to = isPresent ? "Present" : toDate ? formatDate(toDate) : "Present";
  return from ? `${from} – ${to}` : to;
}

function experienceTitle(experience: ExperiencePublicOutput): string {
  if (experience.title && experience.organization) {
    return `${experience.title} · ${experience.organization}`;
  }
  return experience.title || experience.organization;
}

export const Experience = ({ username }: { username: string }) => {
  const portfolioQuery = useGetPortfolioListQuery(username);
  const defaultResumeQuery = useGetDefaultResumeQuery(username);
  const experiences = portfolioQuery.data?.experiences ?? [];
  const defaultResume = defaultResumeQuery.data;

  return (
    <>
      {experiences.length > 0 ? (
        <ol className="m-0 flex w-full list-none flex-col p-0">
          {experiences.map((experience, index) => (
            <ExperienceItem
              key={experience.id}
              experience={experience}
              isLast={index === experiences.length - 1}
            />
          ))}
        </ol>
      ) : null}

      {defaultResume ? (
        <div className={cn("flex", experiences.length > 0 ? "mt-8" : "mt-0")}>
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={`/api/resume/download/?id=${defaultResume.id}&username=${encodeURIComponent(username)}`}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <DownloadIcon className="size-3.5" strokeWidth={2} aria-hidden />
            Download resume
          </Button>
        </div>
      ) : null}
    </>
  );
};

/**
 * Shared-edge timeline (better-layout):
 * - md+: fixed date column → centered rail → fluid content
 * - <md: rail | content only (date under title); rail aligns with title start
 * Connector uses a real vertical segment that extends through row gap (pb-8).
 */
export const ExperienceItem = ({
  experience,
  isLast
}: {
  experience: ExperiencePublicOutput;
  isLast: boolean;
}) => {
  const duration = formatDuration(experience.fromDate, experience.toDate, experience.isPresent);
  const title = experienceTitle(experience);
  const dateTime = experience.fromDate ?? undefined;

  // Shared header band height = circle size (size-3.5 → 0.875rem) so date, dot, and title share one centerline.
  const headerBand = "h-3.5";
  const dateClassName = cn(
    "text-xs leading-none font-medium whitespace-nowrap text-muted-foreground tabular-nums"
  );

  return (
    <li
      className={cn(
        // <md: rail + content only (no empty date track).
        // md+: date | rail | content — fixed date width keeps every circle on one edge.
        "grid w-full items-stretch gap-x-3",
        "grid-cols-[1rem_minmax(0,1fr)]",
        "md:grid-cols-[9.5rem_1rem_minmax(0,1fr)] md:gap-x-4",
        !isLast && "pb-8"
      )}
    >
      {/* Date column — md+ only (left track). */}
      <time
        dateTime={dateTime}
        className={cn(headerBand, dateClassName, "hidden items-center text-start md:flex")}
      >
        {duration}
      </time>

      {/*
        Rail column stretches with the grid row (items-stretch).
        Circle is in-flow at the top; line is abspos on THIS full-height box
        (not the 14px circle box) so it runs through content + pb-8 gap.
        left-1/2 -translate-x-1/2 keeps the 1px stroke on the circle center.
      */}
      <div className="relative flex w-full flex-col items-center" aria-hidden>
        <span className="relative z-10 size-3.5 shrink-0 rounded-full border-2 border-foreground bg-background" />
        {!isLast ? (
          <span className="absolute top-3.5 -bottom-8 left-1/2 w-px -translate-x-1/2 bg-foreground" />
        ) : null}
      </div>

      <div className="min-w-0">
        <h3
          className={cn(
            headerBand,
            "flex items-center text-sm leading-none font-medium text-foreground"
          )}
        >
          {title}
        </h3>
        {/* Date under title — <md only. */}
        <time dateTime={dateTime} className={cn(dateClassName, "mt-1.5 block md:hidden")}>
          {duration}
        </time>
        {experience.description?.trim() ? (
          <div
            className="mt-1.5 text-sm leading-relaxed text-muted-foreground [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(experience.description) }}
          />
        ) : null}
      </div>
    </li>
  );
};
