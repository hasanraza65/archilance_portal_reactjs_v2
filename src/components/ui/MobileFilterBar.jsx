import React, { useState } from "react";
import Button from "./Button";
import Icon from "./Icon";
import BottomSheet from "./BottomSheet";
import { cn } from "@/lib/cn";

/**
 * The mobile filter pattern used across list screens.
 *
 * Phones can't fit a row of selects, so instead of shrinking everything until
 * it's unusable we collapse to two things that always fit:
 *
 *   [ 🔍 search — full width ] [ Filters ² ]
 *
 * The badge is the important part: filters live behind a tap, so the count is
 * what tells you something is narrowing your results. Without it a hidden
 * filter silently lies about what you're looking at.
 *
 * Active filter values also render as removable chips beneath, so you can see
 * and undo them without reopening the sheet.
 *
 * Everything here is `sm:hidden` — desktop keeps its inline layout untouched.
 */
const MobileFilterBar = ({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  activeCount = 0,
  chips = [],
  onClearAll,
  sheetTitle = "Filters",
  sheetSubtitle,
  children,
  actions,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative flex-1 min-w-0">
            <Icon
              icon="solar:magnifer-linear"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[15px] pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              // 16px font stops iOS Safari zooming the whole page on focus.
              className="w-full h-10 pl-9 pr-9 text-[16px] rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] p-1"
              >
                <Icon icon="solar:close-circle-linear" className="text-[16px]" />
              </button>
            )}
          </div>
        )}

        {children && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "relative h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-1.5 flex-none transition-colors",
              activeCount > 0
                ? "border-primary-400 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                : "border-[var(--line-subtle)] bg-[var(--surface-raised)] text-[var(--ink-secondary)]"
            )}
          >
            <Icon icon="solar:filter-linear" className="text-[16px]" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2 -mx-4 px-4">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onRemove}
              className="flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-primary-500/10 text-primary-700 dark:text-primary-300 text-[11px] font-medium flex-none max-w-[60vw]"
            >
              <span className="truncate">{c.label}</span>
              <Icon icon="solar:close-circle-linear" className="text-[13px] flex-none" />
            </button>
          ))}
          {chips.length > 1 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-7 px-2.5 rounded-full text-[11px] font-medium text-[var(--ink-tertiary)] underline flex-none"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        footer={
          <div className="flex gap-2">
            {onClearAll && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { onClearAll(); setOpen(false); }}
                disabled={activeCount === 0}
              >
                Clear all
              </Button>
            )}
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Show results
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">{children}</div>
        {actions && <div className="mt-5 pt-4 border-t border-[var(--line-subtle)] space-y-2">{actions}</div>}
      </BottomSheet>
    </div>
  );
};

export default MobileFilterBar;
