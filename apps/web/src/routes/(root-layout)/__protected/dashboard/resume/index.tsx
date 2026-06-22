import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Code, Package } from "lucide-react";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Container } from "@tsu-stack/ui/components/container";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";

import { generateAppSeo } from "@/shared/lib/seo";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/(root-layout)/__protected/dashboard/resume/")({
  head: () =>
    generateAppSeo({
      alternates: {
        canonicalPath: "/dashboard/resume"
      },
      description: `Manage your resume content in ${appConfig.site.shortName}.`,
      robots: {
        follow: false,
        index: false
      },
      title: "Resume"
    }),
  component: ResumeOverviewPage
});

function ExperienceCount({ count }: { count: number }) {
  return (
    <span className="text-sm text-muted-foreground">
      {count === 1 ? "1 experience" : `${count} experiences`}
    </span>
  );
}

function ProjectCount({ count }: { count: number }) {
  return (
    <span className="text-sm text-muted-foreground">
      {count === 1 ? "1 project" : `${count} projects`}
    </span>
  );
}

function ResumeOverviewPage() {
  const experiencesQuery = useQuery(orpc.portfolio.experiences.list.queryOptions());
  const projectsQuery = useQuery(orpc.portfolio.projects.list.queryOptions());

  if (!experiencesQuery.data || !projectsQuery.data) {
    return <ResumeOverviewSkeleton />;
  }

  const experiences = experiencesQuery.data;
  const projects = projectsQuery.data;

  const allStacks = projects.flatMap((p) => p.stacks);
  const uniqueStackNames = [...new Set(allStacks.map((s) => s.name))];

  return (
    <Container>
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Resume</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your professional experiences, projects, and tech stacks.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Experiences</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <ExperienceCount count={experiences.length} />
            <Badge variant="outline">{experiences.length}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <ProjectCount count={projects.length} />
            <Badge variant="outline">{projects.length}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tech Stacks</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {uniqueStackNames.length === 1
                ? "1 unique stack"
                : `${uniqueStackNames.length} unique stacks`}
            </span>
            <Badge variant="outline">{uniqueStackNames.length}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-medium">Recent Experiences</h2>
        <div className="space-y-3">
          {experiences.slice(0, 3).map((exp) => (
            <Card key={exp.id} size="sm">
              <CardHeader>
                <CardTitle>{exp.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{exp.organization}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exp.projects.slice(0, 3).map((proj) => (
                    <Badge key={proj.id} variant="secondary">
                      <Code className="mr-1 size-3" />
                      {proj.title}
                    </Badge>
                  ))}
                  {exp.projects.length > 3 && (
                    <Badge variant="outline">+{exp.projects.length - 3} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-medium">All Tech Stacks</h2>
        <div className="flex flex-wrap gap-2">
          {allStacks.length === 0 && (
            <p className="text-sm text-muted-foreground">No stacks configured yet.</p>
          )}
          {[...new Map(allStacks.map((s) => [s.name, s])).values()].map((stack) => (
            <Badge key={stack.id} variant="secondary">
              <Package className="mr-1 size-3" />
              {stack.name}
            </Badge>
          ))}
        </div>
      </div>
    </Container>
  );
}

function ResumeOverviewSkeleton() {
  return (
    <Container>
      <div className="mb-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
