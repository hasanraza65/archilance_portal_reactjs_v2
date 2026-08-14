import React, { useRef } from "react";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

/**
 * The "type a title and press Enter" row used for tasks, sub-tasks and
 * checklist items.
 *
 * A placeholder saying "press Enter" wasn't enough: on a phone the return key
 * is labelled Go/Done/Next depending on the keyboard, placeholder text vanishes
 * the moment you start typing — exactly when you need to know how to commit —
 * and there was no visible way to submit at all without a keyboard.
 *
 * So the commit action is now a real, always-visible button. It sits inert
 * while the field is empty and turns primary the moment there's something to
 * save, which teaches the interaction without a tooltip. The ⏎ keycap next to
 * it (pointer devices only, where that key exists and is labelled that way)
 * shows keyboard users the shortcut for next time.
 */
const InlineAddField = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  multiline = false,
  autoFocus = true,
  submitLabel = "Add",
  icon = "solar:add-circle-linear",
  className,
  busy = false,
}) => {
  const formRef = useRef(null);
  const hasText = Boolean(value.trim());

  const submit = (e) => {
    e?.preventDefault();
    if (!hasText || busy) return;
    onSubmit(value);
  };

  const handleKeyDown = (e) => {
    // Shift+Enter stays a newline in the multiline variant so a pasted or
    // hand-typed list still works.
    if (e.key === "Enter" && !(multiline && e.shiftKey)) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  // Only give up on an empty field when focus genuinely leaves the row —
  // otherwise tapping Add would dismiss the very field it's submitting.
  const handleBlur = (e) => {
    if (formRef.current?.contains(e.relatedTarget)) return;
    if (!hasText) onCancel?.();
  };

  const inputProps = {
    autoFocus,
    value,
    onChange: (e) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    placeholder,
    // 16px on phones, or iOS Safari zooms the page on focus.
    className: cn(
      "flex-1 min-w-0 bg-transparent outline-none text-[16px] sm:text-[13.5px]",
      "placeholder:text-[var(--ink-tertiary)]",
      multiline && "resize-none leading-snug"
    ),
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)]",
        "px-2.5 py-1.5 transition-[border-color,box-shadow] duration-150 ease-out",
        "focus-within:border-primary-400",
        className
      )}
    >
      <Icon icon={icon} className="text-[15px] text-[var(--ink-tertiary)] flex-none" />

      {multiline ? <textarea rows={1} {...inputProps} /> : <input type="text" {...inputProps} />}

      <button
        type="button"
        // preventDefault keeps focus in the field, so the blur handler above
        // never races the click.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCancel?.()}
        aria-label="Cancel"
        className={cn(
          "flex-none w-8 h-8 sm:w-7 sm:h-7 rounded-lg grid place-items-center",
          "text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
          "transition-colors duration-150 ease-out"
        )}
      >
        <Icon icon="solar:close-circle-linear" className="text-[15px]" />
      </button>

      <button
        type="submit"
        onMouseDown={(e) => e.preventDefault()}
        disabled={!hasText || busy}
        className={cn(
          "flex-none inline-flex items-center gap-1.5 h-8 sm:h-7 px-2.5 rounded-lg",
          "text-[13px] font-semibold",
          "transition-[background-color,color,transform] duration-150 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
          hasText && !busy
            ? "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
            : "bg-[var(--surface-sunken)] text-[var(--ink-tertiary)] cursor-not-allowed"
        )}
      >
        {busy ? (
          <Icon icon="svg-spinners:180-ring" className="text-[13px]" />
        ) : (
          <>
            {submitLabel}
            {/* Keycap is pointer-only: touch keyboards label this key Go/Done,
                so showing "⏎" there would name a key that isn't on screen. */}
            <kbd className="hidden [@media(pointer:fine)]:inline-block text-[10px] leading-none font-sans px-1 py-0.5 rounded border border-current/30 opacity-80">
              ⏎
            </kbd>
          </>
        )}
      </button>
    </form>
  );
};

export default InlineAddField;
