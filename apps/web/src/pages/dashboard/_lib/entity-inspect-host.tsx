"use client";

import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  clearEntityInspectRequest,
  useEntityFormHostActive,
  useEntityInspectHostSelector,
  type EntityInspectHostRequest
} from "@/features/agent-hub";

import { ProjectInfoPanel } from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { ExperienceInfoPanel } from "@/pages/dashboard/experiences/experience-info-panel";
import { StackDetailPanel } from "@/pages/dashboard/stacks/stacks-page";

export function EntityInspectHost() {
  const request = useEntityInspectHostSelector((state) => state.request);
  const formOpen = useEntityFormHostActive();
  if (!request || formOpen) return null;
  return <EntityInspectHostSession key={request.requestId} request={request} />;
}

function EntityInspectHostSession({ request }: { request: EntityInspectHostRequest }) {
  const experienceQuery = useQuery({
    ...orpcQueryClient.experiences.get.queryOptions({ input: { id: request.id } }),
    enabled: request.kind === "experience"
  });
  const projectQuery = useQuery({
    ...orpcQueryClient.projects.get.queryOptions({ input: { id: request.id } }),
    enabled: request.kind === "project"
  });
  const stackQuery = useQuery({
    ...orpcQueryClient.stacks.get.queryOptions({ input: { id: request.id } }),
    enabled: request.kind === "stack"
  });

  const close = () => {
    clearEntityInspectRequest(request.requestId);
  };

  if (request.kind === "project") {
    const project = projectQuery.data;
    if (projectQuery.isLoading && !project) return null;
    if (!project) {
      return (
        <ItemsInspectHost
          open
          item={{ id: request.id }}
          title="Project"
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          {() => <p className="px-6 py-8 text-sm text-muted-foreground">Project not found.</p>}
        </ItemsInspectHost>
      );
    }
    return (
      <ItemsInspectHost
        open
        item={project}
        title="Project"
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {(item) => (item ? <ProjectInfoPanel project={item} /> : null)}
      </ItemsInspectHost>
    );
  }

  if (request.kind === "stack") {
    const stack = stackQuery.data;
    if (stackQuery.isLoading && !stack) return null;
    if (!stack) {
      return (
        <ItemsInspectHost
          open
          item={{ id: request.id }}
          title="Stack"
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          {() => <p className="px-6 py-8 text-sm text-muted-foreground">Stack not found.</p>}
        </ItemsInspectHost>
      );
    }
    return (
      <ItemsInspectHost
        open
        item={stack}
        title="Stack"
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {(item) => (item ? <StackDetailPanel stack={item} /> : null)}
      </ItemsInspectHost>
    );
  }

  const experience = experienceQuery.data;
  if (experienceQuery.isLoading && !experience) return null;
  if (!experience) {
    return (
      <ItemsInspectHost
        open
        item={{ id: request.id }}
        title="Experience"
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {() => <p className="px-6 py-8 text-sm text-muted-foreground">Experience not found.</p>}
      </ItemsInspectHost>
    );
  }
  return (
    <ItemsInspectHost
      open
      item={experience}
      title="Experience"
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {(item) => (item ? <ExperienceInfoPanel experience={item} /> : null)}
    </ItemsInspectHost>
  );
}
