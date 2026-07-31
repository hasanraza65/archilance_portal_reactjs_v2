import React, { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import Icon from "@/components/ui/Icon";
import AvatarStack from "@/components/ui/AvatarStack";
import { PriorityPill } from "@/components/ui/StatusPill";
import DueDatePill from "@/components/ui/DueDatePill";
import { isCompletedStatus } from "@/lib/statusMeta";
import { cn } from "@/lib/cn";

const CardBody = ({ task }) => (
  <>
    <p
      className={cn(
        "text-[13px] font-medium text-[var(--ink-primary)] mb-2.5 line-clamp-2",
        isCompletedStatus(task.task_status) && "line-through text-[var(--ink-tertiary)]"
      )}
    >
      {task.task_title}
    </p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {task.priority && <PriorityPill priority={task.priority} showLabel={false} />}
        {task.has_urgent_descendant && <Icon icon="solar:fire-bold" className="text-priority-urgent text-[13px]" />}
        {(task.sub_tasks_count ?? 0) > 0 && (
          <span className="text-[10px] font-semibold text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-1.5 py-0.5">
            {task.sub_tasks_count}
          </span>
        )}
      </div>
      <AvatarStack people={(task.assignees || []).map((a) => a.user).filter(Boolean)} size="xs" max={3} />
    </div>
    {task.due_date && (
      <div className="mt-2">
        <DueDatePill date={task.due_date} status={task.task_status} editable={false} />
      </div>
    )}
  </>
);

/**
 * The card that follows the pointer while dragging.
 *
 * Deliberately a plain div with no drag wiring: registering a second
 * `useDraggable` for the same task would fight the real one, and that jitter is
 * part of what made dropping feel wrong.
 */
export const KanbanCardOverlay = ({ task }) => (
  <div className="w-[264px] rounded-xl border border-primary-400/60 bg-[var(--surface-raised)] p-3 shadow-float rotate-2 scale-[1.02] cursor-grabbing">
    <CardBody task={task} />
  </div>
);

const KanbanCard = ({ task, onOpen, isEditable = true }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    // A drag that silently does nothing is worse than no drag at all.
    disabled: !isEditable,
  });

  // A drag finishes with a pointerup, which the browser also fires as a click —
  // so letting go of a card used to open its detail sheet. Remember that a drag
  // happened and swallow exactly that one click.
  const draggedRef = useRef(false);
  if (isDragging && !draggedRef.current) draggedRef.current = true;

  const handleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      // No `transform` here on purpose. The DragOverlay is what follows the
      // pointer; translating this node too meant the card moved twice at once.
      // It stays put as a dashed placeholder showing where it came from.
      className={cn(
        "rounded-xl border bg-[var(--surface-raised)] p-3 select-none touch-none",
        isEditable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "transition-[opacity,box-shadow] duration-150",
        isDragging
          ? "opacity-40 border-dashed border-primary-400/60"
          : "border-[var(--line-subtle)] hover:shadow-card"
      )}
    >
      <CardBody task={task} />
    </div>
  );
};

export default KanbanCard;
