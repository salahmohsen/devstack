"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useRef } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

type SortableItemProps<T extends { id: string }> = {
  items: T[];
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  children: (item: T, dragHandleProps: DragHandleProps, isDragging: boolean) => ReactNode;
};

type DragHandleProps = {
  ref: React.Ref<HTMLButtonElement>;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

function SortableList<T extends { id: string }>({
  items,
  onReorder,
  disabled = false,
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} disabled={disabled}>
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
  children
}: {
  id: string;
  disabled: boolean;
  children: (dragHandleProps: DragHandleProps, isDragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const handleRef = useRef<HTMLButtonElement>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  const dragHandleProps: DragHandleProps = {
    ref: handleRef,
    attributes: attributes as unknown as Record<string, unknown>,
    listeners: disabled ? undefined : (listeners as unknown as Record<string, unknown>),
    className: cn(
      "cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing",
      disabled && "pointer-events-none cursor-not-allowed opacity-50"
    )
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandleProps, isDragging)}
    </div>
  );
}

export { SortableList };
