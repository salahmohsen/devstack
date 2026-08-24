import { useNavigate } from "@tanstack/react-router";
import {
  BriefcaseIcon,
  Eye,
  EyeIcon,
  SquareCheckIcon,
  SquareIcon,
  StarIcon,
  Trash2
} from "lucide-react";
import { memo, useState } from "react";

import { type ResumeOutput } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { IconShake } from "@tsu-stack/ui/components/icon-motion";

import { ItemAvatar } from "@/shared/ui/item-avatar";
import { JobIdentityMark } from "@/shared/ui/job-card-marks";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

import { ItemGridCard } from "@/widgets/items-page";

import {
  primaryResumeJob,
  resumeAvatarSeed,
  resumeCardTitle,
  resumeViewHref
} from "@/pages/dashboard/resumes/_lib/resume-identity";
import { useSetDefaultResumeMutation } from "@/pages/dashboard/resumes/api/set-default-resume.mutation";

export function ResumeTypeBadges({
  author,
  isDefault
}: {
  author: ResumeOutput["author"];
  isDefault: boolean;
}) {
  return (
    <>
      <Badge variant="secondary" size="sm">
        {author === "agent" ? "For a job" : "General"}
      </Badge>
      {isDefault ? <Badge size="sm">Default</Badge> : null}
    </>
  );
}

export type ResumeItemProps = {
  resume: ResumeOutput;
  isChecked: boolean;
  batchSelectActive?: boolean;
  isOpen: boolean;
  onOpen: (id: string, resume: ResumeOutput) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export const ResumeItem = memo(function ResumeItem({
  resume,
  isChecked,
  batchSelectActive = false,
  isOpen,
  onOpen,
  onToggleSelect,
  onDelete,
  isDeleting = false
}: ResumeItemProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const setDefaultMutation = useSetDefaultResumeMutation();
  const job = primaryResumeJob(resume);
  const title = resumeCardTitle(resume);

  function openPdf() {
    window.open(resumeViewHref(resume.id), "_blank", "noopener,noreferrer");
  }

  function openJob() {
    if (!job) return;
    void navigate({ to: "/dashboard/tracked-jobs", search: { applicationId: job.id } });
  }

  const sharedActionProps = {
    select: {
      selected: isChecked,
      onToggle: () => onToggleSelect(resume.id)
    },
    delete: {
      onAction: () => setDeleteDialogOpen(true),
      isLoading: isDeleting
    }
  } as const;

  const compactActionButtons = (
    <ListItemActionButtons
      compact
      select={sharedActionProps.select}
      delete={sharedActionProps.delete}
      viewSlot={
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="size-7 active:scale-[0.96]"
          aria-label={`View PDF for ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            openPdf();
          }}
        >
          <EyeIcon strokeWidth={1.75} aria-hidden />
        </Button>
      }
      renderExtraMenuItems={(slots) => (
        <>
          {job ? (
            <slots.Item onClick={openJob}>
              <BriefcaseIcon aria-hidden />
              Open job
            </slots.Item>
          ) : null}
          {!resume.default ? (
            <slots.Item
              disabled={setDefaultMutation.isPending}
              onClick={() => setDefaultMutation.mutate({ id: resume.id })}
            >
              <StarIcon aria-hidden />
              Set as default
            </slots.Item>
          ) : null}
        </>
      )}
    />
  );

  const wideActionButtons = (
    <ListItemActionButtons
      select={sharedActionProps.select}
      delete={sharedActionProps.delete}
      viewSlot={
        job ? (
          <Button
            type="button"
            variant="outline"
            className="active:scale-[0.96]"
            onClick={(event) => {
              event.stopPropagation();
              openJob();
            }}
          >
            <BriefcaseIcon strokeWidth={1.75} aria-hidden />
            Open job
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="active:scale-[0.96]"
            onClick={(event) => {
              event.stopPropagation();
              openPdf();
            }}
          >
            <EyeIcon strokeWidth={1.75} aria-hidden />
            View PDF
          </Button>
        )
      }
      renderExtraMenuItems={(slots) => (
        <>
          {job ? (
            <slots.Item onClick={openPdf}>
              <EyeIcon aria-hidden />
              View PDF
            </slots.Item>
          ) : null}
          {!resume.default ? (
            <slots.Item
              disabled={setDefaultMutation.isPending}
              onClick={() => setDefaultMutation.mutate({ id: resume.id })}
            >
              <StarIcon aria-hidden />
              Set as default
            </slots.Item>
          ) : null}
        </>
      )}
    />
  );

  const card = (
    <ItemGridCard
      id={resume.id}
      name={title}
      isOpen={isOpen}
      isChecked={isChecked}
      batchSelectActive={batchSelectActive}
      onOpen={() => onOpen(resume.id, resume)}
      onToggleSelect={() => onToggleSelect(resume.id)}
      mark={
        job ? (
          <JobIdentityMark
            companyName={job.companyName}
            logoUrl={job.companyLogoUrl}
            size={56}
            selected={isOpen}
            className="size-full"
          />
        ) : (
          <ItemAvatar
            name={resumeAvatarSeed(resume)}
            size={56}
            selected={isOpen}
            className="size-full"
            aria-label={title}
          />
        )
      }
      badges={<ResumeTypeBadges author={resume.author} isDefault={resume.default} />}
      compactActions={compactActionButtons}
      wideActions={wideActionButtons}
    />
  );

  const deleteDialog = (
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Delete this resume?"
      description="This will permanently delete this resume PDF."
      confirmLabel="Delete resume"
      confirmVariant="destructive"
      confirmLoading={isDeleting}
      onConfirm={() => {
        onDelete(resume.id);
        setDeleteDialogOpen(false);
      }}
    />
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block w-full outline-none">{card}</ContextMenuTrigger>
        <ContextMenuPopup className="min-w-44">
          <ContextMenuItem closeOnClick onClick={() => onOpen(resume.id, resume)}>
            <Eye aria-hidden />
            View
          </ContextMenuItem>
          <ContextMenuItem closeOnClick onClick={openPdf}>
            <EyeIcon aria-hidden />
            View PDF
          </ContextMenuItem>
          {job ? (
            <ContextMenuItem closeOnClick onClick={openJob}>
              <BriefcaseIcon aria-hidden />
              Open job
            </ContextMenuItem>
          ) : null}
          {!resume.default ? (
            <ContextMenuItem
              closeOnClick
              disabled={setDefaultMutation.isPending}
              onClick={() => setDefaultMutation.mutate({ id: resume.id })}
            >
              <StarIcon aria-hidden />
              Set as default
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem closeOnClick onClick={() => onToggleSelect(resume.id)}>
            {isChecked ? <SquareCheckIcon aria-hidden /> : <SquareIcon aria-hidden />}
            {isChecked ? "Deselect" : "Select"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            closeOnClick
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <IconShake mode="hover">
              <Trash2 className="text-destructive" />
            </IconShake>
            Delete
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
      {deleteDialog}
    </>
  );
});
