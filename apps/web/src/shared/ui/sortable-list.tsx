"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  type SortingStrategy,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type SortableAxis = "vertical" | "horizontal" | "both";

/** Keep list drags on the Y axis only (no horizontal wobble). */
const restrictToVerticalAxis: Modifier = ({ transform }) => {
  return {
    ...transform,
    x: 0
  };
};

/** Keep list drags on the X axis only (no vertical wobble). */
const restrictToHorizontalAxis: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: 0
  };
};

function axisModifiers(axis: SortableAxis): Modifier[] | undefined {
  if (axis === "vertical") return [restrictToVerticalAxis];
  if (axis === "horizontal") return [restrictToHorizontalAxis];
  return undefined;
}

function axisTranslate(axis: SortableAxis, transform: { x: number; y: number } | null) {
  if (!transform) return undefined;
  const x = axis === "vertical" ? 0 : transform.x;
  const y = axis === "horizontal" ? 0 : transform.y;
  return `translate3d(${x}px, ${y}px, 0)`;
}

export type DragHandleProps = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

type SortableItemProps<T extends { id: string }> = {
  items: T[];
  onReorder: (items: T[]) => void;
  /**
   * When false (default), renders a plain list with no DnD — `dragHandleProps` is undefined.
   * Opt in for reorderable UIs (e.g. profile contacts while editing).
   */
  sortable?: boolean;
  /**
   * Drag movement axes.
   * - `vertical` (default) — lists
   * - `horizontal` — rows / carousels
   * - `both` — grids
   */
  axis?: SortableAxis;
  disabled?: boolean;
  strategy?: SortingStrategy;
  containerClassName?: string;
  /**
   * When `true`, the items container gets the `group` class so child
   * items can use `group-hover:*` modifiers (e.g. dim siblings while
   * the hovered item stays at full opacity and scales up). Off by
   * default so existing usages aren't affected.
   */
  siblingsDimOnHover?: boolean;
  children: (
    item: T,
    dragHandleProps: DragHandleProps | undefined,
    isDragging: boolean
  ) => ReactNode;
};

function SortableList<T extends { id: string }>({
  items,
  onReorder,
  sortable = false,
  axis = "vertical",
  disabled = false,
  strategy = verticalListSortingStrategy,
  containerClassName,
  siblingsDimOnHover = false,
  children
}: SortableItemProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  const listClassName = cn(containerClassName, siblingsDimOnHover && "group");

  if (!sortable) {
    return (
      <div className={listClassName}>
        {items.map((item) => (
          <div key={item.id} className="min-w-0">
            {children(item, undefined, false)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={axisModifiers(axis)}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={strategy}>
        <div className={listClassName}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} disabled={disabled} axis={axis}>
              {(dragHandleProps, isDragging) => children(item, dragHandleProps, isDragging)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  disabled,
  axis,
  children
}: {
  id: string;
  disabled: boolean;
  axis: SortableAxis;
  children: (dragHandleProps: DragHandleProps, isDragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const style: React.CSSProperties = {
    transform: axisTranslate(axis, transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  const dragHandleProps: DragHandleProps = {
    attributes: attributes as unknown as Record<string, unknown>,
    listeners: disabled ? undefined : (listeners as unknown as Record<string, unknown>),
    className: cn(
      "cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing",
      disabled && "pointer-events-none cursor-not-allowed opacity-50"
    )
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      {children(dragHandleProps, isDragging)}
    </div>
  );
}

export { SortableList };
