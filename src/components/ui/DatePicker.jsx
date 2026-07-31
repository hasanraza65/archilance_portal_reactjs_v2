import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, format, parseISO,
} from "date-fns";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A compact popover calendar. `value` is a "YYYY-MM-DD" string or null.
 * `onChange(dateString|null)`. `trigger` overrides the default pill button.
 */
const PANEL_WIDTH = 288; // matches w-72
const VIEWPORT_MARGIN = 8;

/**
 * `anchorClassName` controls how the trigger sits in its parent. The default
 * `inline-flex` shrink-wraps (right for a pill in a toolbar), but inside a form
 * grid that makes the field narrower than its neighbours no matter how much
 * `w-full` the trigger carries — the wrapper is what's shrinking. Form usages
 * pass `flex w-full`.
 */
const DatePicker = ({ value, onChange, trigger, align = "left", anchorClassName = "inline-flex" }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [viewMonth, setViewMonth] = useState(() => (value ? parseISO(value) : new Date()));
  const anchorRef = useRef(null);
  const panelRef = useRef(null);

  const selected = value ? parseISO(value) : null;

  const openPanel = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) {
      // Start from the requested side, then clamp so the panel can never run
      // off either edge of the viewport regardless of where the trigger sits.
      let left = align === "right" ? rect.right - PANEL_WIDTH : rect.left;
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));

      // Flip above the trigger if there isn't room below.
      const estimatedPanelHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow < estimatedPanelHeight && rect.top > estimatedPanelHeight
        ? rect.top - estimatedPanelHeight - 6
        : rect.bottom + 6;

      setPos({ top, left });
    }
    setViewMonth(selected || new Date());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const pick = (day) => {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <>
      <span ref={anchorRef} onClick={openPanel} className={cn(anchorClassName)}>
        {trigger}
      </span>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
              className="w-72 rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel p-3"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-sunken)]">
                  <Icon icon="solar:alt-arrow-left-linear" />
                </button>
                <span className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</span>
                <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-sunken)]">
                  <Icon icon="solar:alt-arrow-right-linear" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-[var(--ink-tertiary)] h-6 flex items-center justify-center">
                    {d}
                  </div>
                ))}
                {days.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSelected = selected && isSameDay(day, selected);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => pick(day)}
                      className={cn(
                        "h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-colors",
                        !inMonth && "text-[var(--ink-tertiary)] opacity-40",
                        inMonth && !isSelected && "text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]",
                        isSelected && "bg-primary-500 text-white",
                        isToday(day) && !isSelected && "ring-1 ring-primary-400 ring-inset"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line-subtle)]">
                <button type="button" onClick={() => pick(new Date())} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline px-1">
                  Today
                </button>
                {value && (
                  <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="text-xs font-medium text-danger-500 hover:underline px-1">
                    Clear date
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default DatePicker;
