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
  ArrowRightLeftIcon,
  BookmarkIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleIcon,
  EyeIcon,
  GhostIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SparklesIcon,
  XCircleIcon
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  HIRING_URGENCY_LABELS,
  isApplicationOpen,
  type ApplicationOutcome,
  type ApplicationOutput,
  type ApplicationStage
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger
} from "@tsu-stack/ui/components/menu";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  APPLICATION_STAGE_BADGE_VARIANT,
  ApplicationApplyLinks,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  useSetOutcomeMutation,
  useUpdateStageMutation
} from "@/features/applications";

import { ItemsEmpty } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/applications/_lib/application.slice";
import { ApplyPackageMenuItems } from "@/pages/dashboard/applications/ui/apply-package-entry-actions";

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

const OUTCOME_ICONS: Record<ApplicationOutcome, ComponentType<{ className?: string }>> = {
  rejected: XCircleIcon,
  withdrawn: CircleDashedIcon,
  ghosted: GhostIcon,
  accepted: CheckCircle2Icon
};

type ActionItemProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  className?: string;
};

type ActionSubTriggerProps = {
  children: ReactNode;
};

type ActionSubPopupProps = {
  children: ReactNode;
};

type ActionSlots = {
  Item: ComponentType<ActionItemProps>;
  Separator: ComponentType;
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<ActionSubTriggerProps>;
  SubPopup: ComponentType<ActionSubPopupProps>;
};

const menuSlots: ActionSlots = {
  Item: ({ children, onClick, variant }) => (
    <MenuItem onClick={onClick} variant={variant}>
      {children}
    </MenuItem>
  ),
  Separator: () => <MenuSeparator />,
  Sub: ({ children }) => <MenuSub>{children}</MenuSub>,
  SubTrigger: ({ children }) => <MenuSubTrigger>{children}</MenuSubTrigger>,
  SubPopup: ({ children }) => <MenuSubPopup>{children}</MenuSubPopup>
};

const contextSlots: ActionSlots = {
  Item: ({ children, onClick, variant }) => (
    <ContextMenuItem onClick={onClick} variant={variant}>
      {children}
    </ContextMenuItem>
  ),
  Separator: () => <ContextMenuSeparator />,
  Sub: ({ children }) => <ContextMenuSub>{children}</ContextMenuSub>,
  SubTrigger: ({ children }) => <ContextMenuSubTrigger>{children}</ContextMenuSubTrigger>,
  SubPopup: ({ children }) => <ContextMenuSubPopup>{children}</ContextMenuSubPopup>
};

function ApplicationCardActions({ app, slots }: { app: ApplicationOutput; slots: ActionSlots }) {
  const { openEdit, openView } = useApplicationStore();
  const updateStage = useUpdateStageMutation();
  const setOutcome = useSetOutcomeMutation();
  const { Item, Separator, Sub, SubTrigger, SubPopup } = slots;

  return (
    <>
      <Item onClick={() => openView(app)}>
        <EyeIcon aria-hidden="true" />
        View
      </Item>
      <Item onClick={() => openEdit(app)}>
        <PencilIcon aria-hidden="true" />
        Edit
      </Item>

      <Separator />

      <Sub>
        <SubTrigger>
          <ArrowRightLeftIcon aria-hidden="true" />
          Move to
        </SubTrigger>
        <SubPopup>
          {APPLICATION_STAGES.filter((s) => s !== app.stage).map((stage) => {
            const Icon = STAGE_ICONS[stage];
            return (
              <Item key={stage} onClick={() => updateStage.mutate({ id: app.id, stage })}>
                <Icon aria-hidden="true" />
                {APPLICATION_STAGE_LABELS[stage]}
              </Item>
            );
          })}
        </SubPopup>
      </Sub>

      <ApplyPackageMenuItems app={app} slots={{ Item, Separator }} />

      <Sub>
        <SubTrigger>
          <XCircleIcon aria-hidden="true" />
          Close as
        </SubTrigger>
        <SubPopup>
          {(Object.keys(APPLICATION_OUTCOME_LABELS) as ApplicationOutcome[]).map((outcome) => {
            const Icon = OUTCOME_ICONS[outcome];
            return (
              <Item
                key={outcome}
                onClick={() => setOutcome.mutate({ id: app.id, outcome })}
                variant={
                  outcome === "rejected" || outcome === "withdrawn" ? "destructive" : "default"
                }
              >
                <Icon aria-hidden="true" />
                {APPLICATION_OUTCOME_LABELS[outcome]}
              </Item>
            );
          })}
        </SubPopup>
      </Sub>
    </>
  );
}

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

        {/* coss Menu — 3-dot trigger (click) */}
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                aria-label="Open application menu"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontalIcon className="size-4" aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="end" side="bottom" className="min-w-44">
            <ApplicationCardActions app={app} slots={menuSlots} />
          </MenuPopup>
        </Menu>
      </div>
      {(app.matchScore != null ||
        app.applyMethod !== "unknown" ||
        app.hiringUrgency !== "unknown") && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ApplicationMatchScoreBadge matchScore={app.matchScore} />
          <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
          {app.hiringUrgency !== "unknown" ? (
            <Badge variant="secondary">{HIRING_URGENCY_LABELS[app.hiringUrgency]}</Badge>
          ) : null}
        </div>
      )}
      <ApplicationApplyLinks
        applyUrl={app.applyUrl}
        url={app.url}
        applyMethod={app.applyMethod}
        className="mt-2"
      />
      {app.resumeId ? (
        <div className="mt-2 text-xs text-muted-foreground">Resume linked</div>
      ) : null}
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
          <ApplicationCardActions app={app} slots={contextSlots} />
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
        "flex h-full min-h-0 min-w-56 flex-1 flex-col rounded-xl border border-border bg-muted/30",
        (isOver || overId === stage) && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <StageIcon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
          <span className="truncate">{APPLICATION_STAGE_LABELS[stage]}</span>
        </span>
        <Badge
          variant={APPLICATION_STAGE_BADGE_VARIANT[stage]}
          size="sm"
          className="tabular-nums"
          aria-label={`${items.length} applications in ${APPLICATION_STAGE_LABELS[stage]}`}
        >
          {items.length}
        </Badge>
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
  const { markStageInFlight: markInFlight, openCreate } = useApplicationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const openApps = useMemo(
    () => applications.filter((a) => isApplicationOpen(a.outcome)),
    [applications]
  );

  if (applications.length === 0) {
    return (
      <ItemsEmpty
        icon={<BriefcaseIcon aria-hidden />}
        title="No applications yet"
        description="Add a job to track stages on the board."
        action={
          <Button type="button" onClick={openCreate}>
            <PlusIcon aria-hidden />
            Add application
          </Button>
        }
      />
    );
  }

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
