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
  HIRING_URGENCY_LABELS,
  isApplicationOpen,
  type ApplicationOutput,
  type ApplicationStage
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  APPLICATION_STAGE_BADGE_VARIANT,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  useUpdateStageMutation
} from "@/features/applications";

import { ItemsEmpty } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { ApplicationActionGroup } from "@/pages/dashboard/tracked-jobs/ui/application-action-group";
import { applicationContextSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
import { ApplicationItemActions } from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";

type ApplicationsBoardProps = {
  applications: ApplicationOutput[];
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
  const { openView } = useApplicationStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { stage: app.stage, app },
    disabled
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const cardBody = (
    <div
      className={cn(
        "group rounded-lg border border-border bg-card p-2.5 shadow-xs",
        isDragging && "opacity-40",
        isOverlay && "rotate-1 opacity-100 shadow-md",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
          {...listeners}
          {...attributes}
          onClick={() => {
            if (!isDragging) openView(app);
          }}
        >
          <div className="truncate text-sm font-medium">{app.companyName}</div>
          <div className="truncate text-xs text-muted-foreground">{app.title}</div>
        </button>
      </div>
      {(app.listingClosed ||
        app.matchScore != null ||
        app.applyMethod !== "unknown" ||
        app.hiringUrgency !== "unknown") && (
        <div className="mt-1.5 flex flex-wrap gap-1">
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
          <ApplicationMatchScoreBadge matchScore={app.matchScore} />
          <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
          {app.hiringUrgency !== "unknown" ? (
            <Badge variant="secondary" size="xs">
              {HIRING_URGENCY_LABELS[app.hiringUrgency]}
            </Badge>
          ) : null}
        </div>
      )}
      {!isOverlay ? <ApplicationActionGroup app={app} variant="board" /> : null}
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
          <ApplicationItemActions app={app} slots={applicationContextSlots} />
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

export function ApplicationsBoard({ applications }: ApplicationsBoardProps) {
  const updateStage = useUpdateStageMutation();
  const { markStageInFlight: markInFlight, openCreate, openImportJdSheet } = useApplicationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const openApps = useMemo(
    () => applications.filter((a) => isApplicationOpen(a.outcome)),
    [applications]
  );

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
      <DragOverlay>{activeApp ? <ApplicationCard app={activeApp} isOverlay /> : null}</DragOverlay>
    </DndContext>
  );
}
