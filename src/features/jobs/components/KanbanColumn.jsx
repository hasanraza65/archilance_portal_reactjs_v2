import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/cn";

const KanbanColumn = ({ status, tasks, onOpenTask, isEditable = true, isDraggingAny = false }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status.value}`, data: { status: status.value } });

  return (
    <div className="flex flex-col w-[280px] flex-none">
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <span className="w-2 h-2 rounded-full flex-none" style={{ background: status.color }} />
        <span className="text-sm font-semibold text-[var(--ink-primary)]">{status.label}</span>
        <span className="text-xs text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-2xl p-2 min-h-[120px] transition-colors",
          isOver ? "bg-primary-500/8 ring-2 ring-primary-400/50" : "bg-[var(--surface-sunken)]/50"
        )}
      >
        {/* `layout` makes the remaining cards slide up when one leaves, and the
            arriving card settle in, instead of the list snapping. */}
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <KanbanCard task={task} onOpen={onOpenTask} isEditable={isEditable} />
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div
            className={cn(
              "h-16 flex items-center justify-center text-[11px] rounded-xl transition-colors",
              isOver
                ? "text-primary-600 dark:text-primary-400 border-2 border-dashed border-primary-400/60"
                : isDraggingAny
                ? "text-[var(--ink-tertiary)] border-2 border-dashed border-[var(--line-subtle)]"
                : "text-[var(--ink-tertiary)]"
            )}
          >
            {isOver ? "Release to move here" : "Drop here"}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
