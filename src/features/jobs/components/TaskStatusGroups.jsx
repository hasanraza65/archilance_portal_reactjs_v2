import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { STATUS_OPTIONS } from "@/lib/statusMeta";

/**
 * Groups one level of the task tree into status sections, in the app's
 * canonical order (Backlog → On Hold → … → Client Review → Completed) — the
 * same order the Jobs list and the kanban columns already use, so every
 * surface tells the same story.
 *
 * Speed: this is pure client-side grouping of rows the tree has ALREADY
 * fetched for that level — zero extra requests, one memoised pass, so
 * expanding feels exactly as fast as before.
 *
 * Headers show at EVERY level, even when a level currently has one status —
 * a subtask list that silently switched between grouped and flat as statuses
 * changed read as broken, and consistency beats the saved row. The only flat
 * case is a single lone task, where a header above one row says nothing.
 * Sections collapse on tap (state is per-mount, deliberately not persisted).
 *
 * Render-prop (`renderTask`) rather than importing TaskTreeRow, because
 * TaskTreeRow renders THIS component for its children — a direct import would
 * be circular.
 */
const TaskStatusGroups = ({ tasks = [], indent = 0, renderTask }) => {
  const groups = useMemo(() => {
    const byStatus = new Map(STATUS_OPTIONS.map((s) => [s.value.toLowerCase(), { meta: s, rows: [] }]));
    // Anything with an unrecognised status still has to show up somewhere —
    // silently dropping rows would read as data loss.
    const other = { meta: { value: "__other", label: "Other", color: "var(--ink-tertiary)" }, rows: [] };
    for (const t of tasks) {
      const bucket = byStatus.get(String(t.task_status || "").toLowerCase()) || other;
      bucket.rows.push(t);
    }
    return [...byStatus.values(), other].filter((g) => g.rows.length > 0);
  }, [tasks]);

  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (value) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  // A single lone task keeps no header — one label above one row is noise.
  if (tasks.length <= 1) return <>{tasks.map(renderTask)}</>;

  return (
    <>
      {groups.map(({ meta, rows }) => {
        const isOpen = !collapsed.has(meta.value);
        return (
          <div key={meta.value}>
            <button
              type="button"
              onClick={() => toggle(meta.value)}
              aria-expanded={isOpen}
              className="group/status flex items-center gap-1.5 w-full py-1.5 pr-2 select-none"
              style={{ paddingLeft: indent }}
            >
              <motion.span
                animate={{ rotate: isOpen ? 0 : -90 }}
                transition={{ duration: 0.15 }}
                className="text-[var(--ink-tertiary)] flex-none"
              >
                <Icon icon="solar:alt-arrow-down-linear" className="text-[11px]" />
              </motion.span>
              <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: meta.color }} />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-secondary)] group-hover/status:text-[var(--ink-primary)] transition-colors">
                {meta.label}
              </span>
              <span className="text-[10px] font-semibold text-[var(--ink-tertiary)] bg-[var(--surface-sunken)] rounded-full px-1.5 py-0.5 flex-none">
                {rows.length}
              </span>
              <span className="flex-1 h-px bg-[var(--line-subtle)] ml-1" />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {rows.map(renderTask)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
};

export default TaskStatusGroups;
