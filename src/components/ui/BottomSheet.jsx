import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

/**
 * Mobile-first bottom sheet.
 *
 * Slides up from the bottom edge — the reachable half of a phone screen —
 * rather than the side, so the grab handle and primary action land under the
 * thumb. Content scrolls; the footer stays pinned.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps the footer clear of the iOS home
 * indicator, which otherwise sits right on top of the Apply button.
 */
const BottomSheet = ({ open, onClose, title, subtitle, children, footer, className }) => (
  <Dialog open={open} onClose={onClose} transition className="relative z-50 sm:hidden">
    <div
      className="fixed inset-0 bg-[var(--surface-overlay)] backdrop-blur-[2px] transition duration-200 data-[closed]:opacity-0"
      aria-hidden="true"
    />
    <div className="fixed inset-0 flex items-end">
      <DialogPanel
        transition
        className={cn(
          "w-full max-h-[88vh] flex flex-col rounded-t-2xl bg-[var(--surface-raised)] shadow-float",
          "border-t border-[var(--line-subtle)]",
          "transition duration-250 ease-out data-[closed]:translate-y-full",
          className
        )}
      >
        {/* Grab handle — the affordance that says "drag or tap outside to dismiss". */}
        <div className="flex justify-center pt-2.5 pb-1 flex-none">
          <span className="w-10 h-1 rounded-full bg-[var(--line-strong)]" />
        </div>

        {title && (
          <div className="flex items-start gap-3 px-4 pb-3 flex-none">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-[var(--ink-primary)]">{title}</DialogTitle>
              {subtitle && <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-[var(--ink-tertiary)] hover:bg-[var(--surface-sunken)] flex-none"
            >
              <Icon icon="solar:close-circle-linear" className="text-[18px]" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

        {footer && (
          <div className="flex-none border-t border-[var(--line-subtle)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[var(--surface-raised)]">
            {footer}
          </div>
        )}
      </DialogPanel>
    </div>
  </Dialog>
);

export default BottomSheet;
