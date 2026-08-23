"use client";

import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import {
  clearEntityInspectRequest,
  requestEntityForm,
  useEntityFormHostActive,
  useEntityInspectHostSelector,
  type EntityInspectHostRequest
} from "@/features/agent-hub";

import { ItemInfoPanel, ProjectInfoPanel } from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { ExperienceInfoPanel } from "@/pages/dashboard/experiences/experience-info-panel";
import { StackDetailPanel } from "@/pages/dashboard/stacks/stacks-page";
import { ApplicationInfoPanel } from "@/pages/dashboard/tracked-jobs/ui/application-info-panel";

export function EntityInspectHost() {
  const request = useEntityInspectHostSelector((state) => state.request);
  const formOpen = useEntityFormHostActive();
  if (!request || formOpen) return null;
  return <EntityInspectHostSession key={request.requestId} request={request} />;
}

function InspectLoading({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <ItemsInspectHost
      open
      item={{ id: "loading" }}
      title={title}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {() => (
        <ItemInfoPanel title={title}>
          <div className="flex min-h-48 items-center justify-center py-10">
            <Spinner className="size-6" aria-label={`Loading ${title}`} />
          </div>
        </ItemInfoPanel>
      )}
    </ItemsInspectHost>
  );
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
  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({ input: { id: request.id } }),
    enabled: request.kind === "application"
  });

  const close = () => {
    clearEntityInspectRequest(request.requestId);
  };

  const openEdit = () => {
    if (request.kind === "application") return;
    clearEntityInspectRequest(request.requestId);
    requestEntityForm({
      requestId: `inspect-edit-${request.id}`,
      kind: request.kind,
      id: request.id,
      toolCallId: `inspect-edit-${request.id}`,
      toolName: "open-entity-form",
      completeOnClose: false
    });
  };

  if (request.kind === "application") {
    const application = applicationQuery.data;
    if (applicationQuery.isPending && !application) {
      return <InspectLoading title="Application" onClose={close} />;
    }
    if (!application) {
      return (
        <ItemsInspectHost
          open
          item={{ id: request.id }}
          title="Job"
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          {() => <p className="px-6 py-8 text-sm text-muted-foreground">Job not found.</p>}
        </ItemsInspectHost>
      );
    }
    const discovery =
      application.trackingStatus === "inbox" || application.trackingStatus === "dismissed";
    return (
      <ItemsInspectHost
        open
        item={application}
        title={application.title}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {(item) =>
          item ? (
            <ApplicationInfoPanel item={item} variant={discovery ? "discovery" : "tracked"} />
          ) : null
        }
      </ItemsInspectHost>
    );
  }

  if (request.kind === "project") {
    const project = projectQuery.data;
    if (projectQuery.isPending && !project) {
      return <InspectLoading title="Project" onClose={close} />;
    }
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
        {(item) => (item ? <ProjectInfoPanel project={item} onEdit={openEdit} /> : null)}
      </ItemsInspectHost>
    );
  }

  if (request.kind === "stack") {
    const stack = stackQuery.data;
    if (stackQuery.isPending && !stack) {
      return <InspectLoading title="Skill" onClose={close} />;
    }
    if (!stack) {
      return (
        <ItemsInspectHost
          open
          item={{ id: request.id }}
          title="Skill"
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          {() => <p className="px-6 py-8 text-sm text-muted-foreground">Skill not found.</p>}
        </ItemsInspectHost>
      );
    }
    return (
      <ItemsInspectHost
        open
        item={stack}
        title="Skill"
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        {(item) => (item ? <StackDetailPanel stack={item} onEdit={openEdit} /> : null)}
      </ItemsInspectHost>
    );
  }

  const experience = experienceQuery.data;
  if (experienceQuery.isPending && !experience) {
    return <InspectLoading title="Experience" onClose={close} />;
  }
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
      {(item) => (item ? <ExperienceInfoPanel experience={item} onEdit={openEdit} /> : null)}
    </ItemsInspectHost>
  );
}
