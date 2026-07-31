import React, { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { useJobRootTasks, useUpdateTaskField } from "../useJobsData";
import { STATUS_OPTIONS } from "@/lib/statusMeta";
import KanbanColumn from "./KanbanColumn";
import { KanbanCardOverlay } from "./KanbanCard";
import EmptyState from "@/components/ui/EmptyState";
import JobPicker from "./JobPicker";


const KanbanBoard = ({ jobs = [], selectedJobId, onSelectJob, onOpenTask, isEditable }) => {
  const activeJobId = selectedJobId || jobs[0]?.id;
  const { data: tasks, isLoading } = useJobRootTasks(activeJobId, Boolean(activeJobId));
  const updateField = useUpdateTaskField();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(() => {
    const map = new Map(STATUS_OPTIONS.map((s) => [s.value, []]));
    for (const t of tasks || []) {
      const bucket = STATUS_OPTIONS.find((s) => s.value.toLowerCase() === String(t.task_status || "").toLowerCase());
      map.get(bucket?.value || STATUS_OPTIONS[0].value)?.push(t);
    }
    return map;
  }, [tasks]);

  const handleDragStart = (e) => setActiveTask(e.active.data.current?.task || null);

  const handleDragCancel = () => setActiveTask(null);

  const handleDragEnd = (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over || !isEditable) return;
    const newStatus = over.data.current?.status;
    const task = active.data.current?.task;
    if (!task || !newStatus || newStatus.toLowerCase() === String(task.task_status || "").toLowerCase()) return;
    updateField.mutate({ taskId: task.id, field: "status", value: newStatus });
  };

  if (!jobs.length) return null;

  return (
    <div>
      <div className="mb-4">
        <JobPicker jobs={jobs} value={activeJobId} onChange={onSelectJob} placeholder="Choose a job…" />
      </div>

      {isLoading ? (
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-64 w-[280px] rounded-2xl flex-none" />)}
        </div>
      ) : !tasks?.length ? (
        <EmptyState icon="solar:widget-4-linear" title="No tasks in this job yet" description="Add tasks from the List view to see them here." />
      ) : (
        <DndContext
          sensors={sensors}
          // Columns are tall; closestCorners picks the intended one far more
          // reliably than the default rect-intersection when the pointer is
          // near an edge or over a gap.
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {STATUS_OPTIONS.map((status) => (
              <KanbanColumn
                key={status.value}
                status={status}
                tasks={columns.get(status.value) || []}
                onOpenTask={onOpenTask}
                isEditable={isEditable}
                isDraggingAny={Boolean(activeTask)}
              />
            ))}
          </div>
          {/*
            dropAnimation={null} is the fix for the "it snapped back, then
            appeared in the new column" jump. By default dnd-kit flies the
            overlay back to the ORIGINAL card's rect before unmounting it —
            but the status update is optimistic, so by then the card is already
            in its new column and that flight is pure noise. Dropping the
            overlay instantly leaves just the real card, already in place.
          */}
          <DragOverlay dropAnimation={null}>
            {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default KanbanBoard;
