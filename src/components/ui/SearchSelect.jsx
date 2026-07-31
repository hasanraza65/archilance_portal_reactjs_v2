import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

const PANEL_MAX_H = 320;
const MARGIN = 8;

/**
 * Compact, searchable select. Deliberately sized like a real product dropdown
 * (matches the trigger's width, caps at ~320px tall) rather than a full-screen
 * sheet. Portaled so it can't be clipped by overflow ancestors, and clamped to
 * the viewport so it never runs off-screen.
 *
 * options: [{ value, label, sublabel?, icon?, avatar?, color? }]
 * renderOption / renderValue let callers customize without forking the component.
 */
const SearchSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  clearable = false,
  className,
  panelWidth,
  renderOption,
  renderValue,
  size = "md",
  emptyText = "No results",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flip: false });
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => options.find((o) => String(o.value) === String(value)) || null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label?.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const place = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = panelWidth || Math.max(rect.width, 200);
    let left = rect.left;
    const maxLeft = window.innerWidth - width - MARGIN;
    left = Math.min(Math.max(left, MARGIN), Math.max(maxLeft, MARGIN));
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < PANEL_MAX_H && rect.top > spaceBelow;
    setPos({ top: flip ? rect.top - MARGIN : rect.bottom + 6, left, width, flip });
  };

  const openPanel = () => {
    if (disabled) return;
    place();
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (opt) => {
    onChange(opt ? opt.value : null, opt);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) pick(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const heights = { sm: "h-8 text-[13px]", md: "h-9.5 text-sm", lg: "h-11 text-sm" };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn(
          "w-full inline-flex items-center gap-2 px-3 rounded-lg border bg-[var(--surface-raised)] transition-colors text-left",
          heights[size],
          open ? "border-primary-400 ring-2 ring-primary-500/20" : "border-[var(--line-subtle)] hover:border-[var(--line-strong)]",
          disabled && "opacity-55 cursor-not-allowed",
          className
        )}
      >
        <span className="flex-1 min-w-0 truncate">
          {selected ? (
            renderValue ? renderValue(selected) : (
              <span className="flex items-center gap-2 min-w-0">
                {selected.color && <span className="w-2 h-2 rounded-full flex-none" style={{ background: selected.color }} />}
                <span className="truncate text-[var(--ink-primary)]">{selected.label}</span>
              </span>
            )
          ) : (
            <span className="text-[var(--ink-tertiary)]">{placeholder}</span>
          )}
        </span>
        {clearable && selected && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
            className="flex-none text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]"
          >
            <Icon icon="solar:close-circle-linear" className="text-[14px]" />
          </span>
        )}
        <Icon icon="solar:alt-arrow-down-linear" className={cn("flex-none text-[13px] text-[var(--ink-tertiary)] transition-transform", open && "rotate-180")} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: pos.flip ? 4 : -4, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.flip ? 4 : -4, scale: 0.985 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                transform: pos.flip ? "translateY(-100%)" : undefined,
                zIndex: 9999,
              }}
              className="rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-panel overflow-hidden flex flex-col"
            >
              <div className="p-1.5 border-b border-[var(--line-subtle)] flex-none">
                <div className="relative">
                  <Icon icon="solar:magnifer-linear" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)] text-[13px]" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                    onKeyDown={onKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full pl-7 pr-2 h-8 rounded-lg bg-[var(--surface-sunken)] text-[13px] focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-1" style={{ maxHeight: PANEL_MAX_H - 52 }}>
                {filtered.length === 0 ? (
                  <p className="text-xs text-[var(--ink-tertiary)] text-center py-6">{emptyText}</p>
                ) : (
                  filtered.map((opt, i) => {
                    const isSelected = String(opt.value) === String(value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => pick(opt)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] transition-colors",
                          i === activeIndex && "bg-[var(--surface-sunken)]",
                          isSelected && "font-semibold"
                        )}
                      >
                        {renderOption ? renderOption(opt, { isSelected }) : (
                          <>
                            {opt.color && <span className="w-2 h-2 rounded-full flex-none" style={{ background: opt.color }} />}
                            {opt.icon && <Icon icon={opt.icon} className="text-[14px] flex-none text-[var(--ink-secondary)]" />}
                            <span className="flex-1 min-w-0">
                              <span className="block truncate text-[var(--ink-primary)]">{opt.label}</span>
                              {opt.sublabel && <span className="block truncate text-[11px] text-[var(--ink-tertiary)]">{opt.sublabel}</span>}
                            </span>
                          </>
                        )}
                        {isSelected && <Icon icon="solar:check-read-linear" className="text-[13px] text-primary-500 flex-none" />}
                      </button>
                    );
                  })
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

export default SearchSelect;
