import { FolderKanbanIcon } from "lucide-react";

import { type ProjectPublicOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";

export function RepoLinkedProjectButton({
  projects,
  openedProjectId,
  onOpenProject
}: {
  projects: ProjectPublicOutput[];
  openedProjectId: string | null;
  onOpenProject: (project: ProjectPublicOutput) => void;
}) {
  if (projects.length === 0) return null;

  if (projects.length === 1) {
    const project = projects[0];
    const open = openedProjectId === project.id;
    const label = open ? `Hide project ${project.title}` : `View project ${project.title}`;

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={label}
              aria-pressed={open}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenProject(project);
              }}
            />
          }
        >
          <FolderKanbanIcon aria-hidden strokeWidth={2} />
        </TooltipTrigger>
        <TooltipPopup>{project.title}</TooltipPopup>
      </Tooltip>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="View linked projects"
            aria-pressed={Boolean(
              openedProjectId && projects.some((project) => project.id === openedProjectId)
            )}
          />
        }
      >
        <FolderKanbanIcon aria-hidden strokeWidth={2} />
      </MenuTrigger>
      <MenuPopup align="start">
        {projects.map((project) => (
          <MenuItem
            key={project.id}
            onClick={() => {
              onOpenProject(project);
            }}
          >
            {project.title}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}
