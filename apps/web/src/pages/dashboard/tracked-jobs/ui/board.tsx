"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BookmarkIcon,
  BriefcaseIcon,
  CircleDotIcon,
  CircleIcon,
  FileTextIcon,
  PhoneIcon,
  PlusIcon,
  SparklesIcon
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import {
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  APPLICATIONS_LIST_BOARD_LIMIT,
  HIRING_URGENCY_LABELS,
  isApplicationOpen,
  type ApplicationOutput,
  type ApplicationStage
} from "@tsu-stack/core";
import { Alert, AlertDescription } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

import { areAllVisibleSelected, isBatchSelectActive } from "@/shared/lib/batch-selection";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { JobIdentityMark, JobYearsBadge } from "@/shared/ui/job-card-marks";

import {
  APPLICATION_STAGE_BADGE_VARIANT,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  getApplicationPrimaryAction,
  useDeleteApplicationsMutation,
  useUpdateStageMutation
} from "@/features/applications";

import { ItemsEmpty } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { ApplicationActionGroup } from "@/pages/dashboard/tracked-jobs/ui/application-action-group";
import { applicationContextSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
import { ApplicationItemActions } from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";

type ApplicationsBoardProps = {
  applications: ApplicationOutput[];
  narrowed: boolean;
  trackedTotal: number;
  totalCount: number;
  onClearFilters: () => void;
};

const STAGE_ICONS: Record<ApplicationStage, ComponentType<{ className?: string }>> = {
  saved: BookmarkIcon,
  applied: CircleIcon,
  screening: PhoneIcon,
  interview: CircleDotIcon,
  offer: SparklesIcon
};

function ApplicationCard({
  app,
  isOverlay,
  disabled
}: {
  app: ApplicationOutput;
  isOverlay?: boolean;
  disabled?: boolean;
}) {
  const { openView, viewItem, selectedIds, toggleSelect } = useApplicationStore();
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const isBatchSelected = selectedIds.includes(app.id);
  const dragDisabled = Boolean(disabled) || batchSelectActive;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { stage: app.stage, app },
    disabled: dragDisabled
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  // Animate only while this card is the open side-panel selection (better-ui: motion restraint).
  const avatarAnimated = viewItem?.id === app.id;

  function handleActivate() {
    if (isOverlay || isDragging) return;
    if (batchSelectActive) {
      toggleSelect(app.id);
      return;
    }
    openView(app);
  }

  const showBadges =
    app.listingClosed ||
    app.matchScore != null ||
    app.applyMethod !== "unknown" ||
    app.hiringUrgency !== "unknown" ||
    app.experienceYearsMin != null;

  const cardBody = (
    <div
      data-selected={avatarAnimated}
      className={cn(
        "group rounded-lg border border-border bg-card p-2.5 shadow-xs",
        isDragging && "opacity-40",
        isOverlay && "rotate-1 opacity-100 shadow-md",
        disabled && "pointer-events-none opacity-60",
        (avatarAnimated || isBatchSelected) && "border-primary/40"
      )}
    >
      <div className="flex items-start gap-1.5">
        {!isOverlay && batchSelectActive ? (
          <div
            data-batch-select
            role="presentation"
            className="flex items-center self-start pt-0.5"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              checked={isBatchSelected}
              onCheckedChange={() => {
                toggleSelect(app.id);
              }}
              aria-label={`Select ${app.title}`}
            />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {showBadges ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {app.listingClosed ? (
                <Badge
                  variant="secondary"
                  size="xs"
                  className="font-normal tracking-normal text-muted-foreground normal-case"
                  title="This posting is no longer on the board."
                >
                  Listing closed
                </Badge>
              ) : null}
              <JobYearsBadge years={app.experienceYearsMin} />
              <ApplicationMatchScoreBadge matchScore={app.matchScore} />
              <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
              {app.hiringUrgency !== "unknown" ? (
                <Badge variant="secondary" size="xs">
                  {HIRING_URGENCY_LABELS[app.hiringUrgency]}
                </Badge>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className={cn(
              "flex w-full min-w-0 items-center gap-2 text-left",
              batchSelectActive || dragDisabled
                ? "cursor-pointer"
                : "cursor-grab active:cursor-grabbing"
            )}
            {...(dragDisabled ? {} : listeners)}
            {...(dragDisabled ? {} : attributes)}
            aria-pressed={batchSelectActive ? isBatchSelected : avatarAnimated}
            onClick={handleActivate}
          >
            <JobIdentityMark
              companyName={app.companyName}
              logoUrl={app.companyLogoUrl}
              size={40}
              selected={avatarAnimated || isBatchSelected}
              className="size-10"
            />
            <span className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{app.companyName}</div>
              <div className="truncate text-xs text-muted-foreground">{app.title}</div>
            </span>
          </button>
          {!isOverlay ? <ApplicationActionGroup app={app} variant="board" /> : null}
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div ref={setNodeRef} style={style}>
        {cardBody}
      </div>
    );
  }

  // coss ContextMenu — right-click / long-press on the whole card
  return (
    <div ref={setNodeRef} style={style}>
      <ContextMenu>
        <ContextMenuTrigger className="block w-full outline-none">{cardBody}</ContextMenuTrigger>
        <ContextMenuPopup className="min-w-44">
          <ApplicationItemActions
            app={app}
            slots={applicationContextSlots}
            hidePrimaryKind={getApplicationPrimaryAction(app)?.kind ?? null}
          />
        </ContextMenuPopup>
      </ContextMenu>
    </div>
  );
}

function StageColumn({
  stage,
  items,
  overId
}: {
  stage: ApplicationStage;
  items: ApplicationOutput[];
  overId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const { stageInFlightIds: inFlight } = useApplicationStore();
  const StageIcon = STAGE_ICONS[stage];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 min-w-60 flex-1 flex-col rounded-xl border border-border bg-muted/30",
        (isOver || overId === stage) && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <StageIcon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
          <span className="truncate">{APPLICATION_STAGE_LABELS[stage]}</span>
        </span>
        <Badge
          variant={APPLICATION_STAGE_BADGE_VARIANT[stage]}
          size="xs"
          className="tabular-nums"
          aria-label={`${items.length} applications in ${APPLICATION_STAGE_LABELS[stage]}`}
        >
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1.5 p-1.5">
          {items.map((app) => (
            <ApplicationCard key={app.id} app={app} disabled={Boolean(inFlight[app.id])} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ApplicationsBoard({
  applications,
  narrowed,
  trackedTotal,
  totalCount,
  onClearFilters
}: ApplicationsBoardProps) {
  const updateStage = useUpdateStageMutation();
  const deleteMutation = useDeleteApplicationsMutation();
  const {
    markStageInFlight: markInFlight,
    openCreate,
    openImportJdSheet,
    selectedIds,
    selectAll,
    clearSelection,
    viewItem,
    closeView
  } = useApplicationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const openApps = useMemo(
    () => applications.filter((a) => isApplicationOpen(a.outcome)),
    [applications]
  );
  const openIds = useMemo(() => openApps.map((app) => app.id), [openApps]);
  const selectedCount = selectedIds.length;
  const allVisibleSelected = areAllVisibleSelected(selectedIds, openIds);

  const deleteSelected = () => {
    if (selectedCount === 0) return;
    const ids = [...selectedIds];
    void deleteMutation.mutateAsync({ ids }).then(() => {
      clearSelection();
      if (viewItem && ids.includes(viewItem.id)) closeView();
    });
  };

  const byStage = useMemo(() => {
    const map = Object.fromEntries(
      APPLICATION_STAGES.map((s) => [s, [] as ApplicationOutput[]])
    ) as Record<ApplicationStage, ApplicationOutput[]>;
    for (const app of openApps) {
      map[app.stage]?.push(app);
    }
    return map;
  }, [openApps]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const activeApp = activeId ? openApps.find((a) => a.id === activeId) : null;

  if (applications.length === 0) {
    if (narrowed) {
      return (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title="No jobs match"
          description="Try a different search or clear filters to see the open board."
          action={
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }
    if (trackedTotal === 0) {
      return (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title="No tracked jobs yet"
          description="Track a discovery from New jobs, add a role manually, or import a job description."
          action={
            <Group>
              <Button type="button" onClick={openCreate}>
                <PlusIcon aria-hidden />
                New
              </Button>
              <GroupSeparator />
              <Button type="button" variant="outline" onClick={openImportJdSheet}>
                <FileTextIcon aria-hidden />
                Import
              </Button>
            </Group>
          }
        />
      );
    }
  }

  function findStage(id: string): ApplicationStage | null {
    if ((APPLICATION_STAGES as readonly string[]).includes(id)) {
      return id as ApplicationStage;
    }
    const app = openApps.find((a) => a.id === id);
    return app?.stage ?? null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    setOverColumn(findStage(overId));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);
    if (!over) return;

    const appId = String(active.id);
    const fromStage = findStage(appId);
    const toStage = findStage(String(over.id));
    if (!fromStage || !toStage || fromStage === toStage) return;

    markInFlight(appId, true);
    updateStage.mutate(
      { id: appId, stage: toStage },
      {
        onSettled: () => markInFlight(appId, false)
      }
    );
  }

  return (
    <>
      {totalCount > APPLICATIONS_LIST_BOARD_LIMIT ? (
        <Alert variant="info">
          <AlertDescription>
            Showing {APPLICATIONS_LIST_BOARD_LIMIT} of {totalCount} open jobs. Narrow filters or
            switch to the list to see the rest. Closed jobs never appear on the board.
          </AlertDescription>
        </Alert>
      ) : null}
      <BatchSelectionBar
        selectedCount={selectedCount}
        totalCount={openIds.length}
        allVisibleSelected={allVisibleSelected}
        isDeleting={deleteMutation.isPending}
        onDeleteSelected={deleteSelected}
        onSelectAll={() => selectAll(openIds)}
        onClearSelection={clearSelection}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto">
          {APPLICATION_STAGES.map((stage) => (
            <StageColumn key={stage} stage={stage} items={byStage[stage]} overId={overColumn} />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? <ApplicationCard app={activeApp} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
