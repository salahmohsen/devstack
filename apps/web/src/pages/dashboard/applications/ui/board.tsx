"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

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
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useUpdateStageMutation, useSetOutcomeMutation } from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";

type ApplicationsBoardProps = {
  applications: ApplicationOutput[];
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
  const { openEdit, openView } = useApplicationStore();
  const updateStage = useUpdateStageMutation();
  const setOutcome = useSetOutcomeMutation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { stage: app.stage, app },
    disabled
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-xs",
        isDragging && "opacity-40",
        isOverlay && "rotate-1 opacity-100 shadow-md",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
          {...listeners}
          {...attributes}
          onClick={() => {
            if (!isDragging) openView(app);
          }}
        >
          <div className="truncate font-medium">{app.companyName}</div>
          <div className="truncate text-sm text-muted-foreground">{app.title}</div>
        </button>
        <Menu>
          <MenuTrigger
            render={
              <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" />
            }
          >
            ···
          </MenuTrigger>
          <MenuPopup align="end">
            {APPLICATION_STAGES.filter((s) => s !== app.stage).map((stage) => (
              <MenuItem key={stage} onClick={() => updateStage.mutate({ id: app.id, stage })}>
                Move to {APPLICATION_STAGE_LABELS[stage]}
              </MenuItem>
            ))}
            <MenuItem onClick={() => openView(app)}>View</MenuItem>
            <MenuItem onClick={() => openEdit(app)}>Edit</MenuItem>
            {(["rejected", "withdrawn", "ghosted", "accepted"] as const).map((outcome) => (
              <MenuItem key={outcome} onClick={() => setOutcome.mutate({ id: app.id, outcome })}>
                Close · {outcome}
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
      </div>
      {app.hiringUrgency !== "unknown" ? (
        <Badge variant="secondary" className="mt-2">
          {HIRING_URGENCY_LABELS[app.hiringUrgency]}
        </Badge>
      ) : null}
      {app.resumeId ? (
        <div className="mt-2 text-xs text-muted-foreground">Resume linked</div>
      ) : null}
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 min-w-56 flex-1 flex-col rounded-xl border border-border bg-muted/30",
        (isOver || overId === stage) && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">{APPLICATION_STAGE_LABELS[stage]}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {items.map((app) => (
          <ApplicationCard key={app.id} app={app} disabled={Boolean(inFlight[app.id])} />
        ))}
      </div>
    </div>
  );
}

export function ApplicationsBoard({ applications }: ApplicationsBoardProps) {
  const updateStage = useUpdateStageMutation();
  const { markStageInFlight: markInFlight } = useApplicationStore();
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

  const activeApp = activeId ? openApps.find((a) => a.id === activeId) : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
