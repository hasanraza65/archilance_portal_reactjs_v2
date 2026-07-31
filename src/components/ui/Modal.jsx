import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { cn } from "@/lib/cn";
import IconButton from "./IconButton";

/**
 * Centred dialog on desktop; bottom sheet on mobile.
 *
 * The panel is a flex column with a hard height cap, so a tall form scrolls its
 * BODY while the title and the footer stay put. Without that cap the panel grew
 * past the viewport — the header scrolled away off the top and the confirm
 * button sat below the fold, which is what made long forms feel broken on a
 * phone.
 *
 * Put action buttons in `footer`, not in `children`, so they stay reachable.
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  className = "max-w-lg",
  showClose = true,
}) => (
  <Dialog open={open} onClose={onClose} transition className="relative z-50">
    <div
      className="fixed inset-0 bg-[var(--surface-overlay)] backdrop-blur-[2px] transition duration-200 data-[closed]:opacity-0"
      aria-hidden="true"
    />
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <DialogPanel
        transition
        className={cn(
          "w-full flex flex-col bg-[var(--surface-raised)] shadow-float border border-[var(--line-subtle)]",
          "rounded-t-2xl sm:rounded-panel",
          "max-h-[92dvh] sm:max-h-[85dvh]",
          "transition duration-200 ease-out",
          "data-[closed]:opacity-0 data-[closed]:translate-y-4 sm:data-[closed]:translate-y-2 sm:data-[closed]:scale-95",
          className
        )}
      >
        {/* Grab handle reads as "this is a sheet you can dismiss". */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 flex-none">
          <span className="w-10 h-1 rounded-full bg-[var(--line-strong)]" />
        </div>

        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-5 pb-3 flex-none">
            {title && (
              <DialogTitle className="text-base font-semibold text-[var(--ink-primary)] truncate">
                {title}
              </DialogTitle>
            )}
            {showClose && (
              <IconButton icon="solar:close-circle-bold" size="sm" onClick={onClose} className="ml-auto flex-none" />
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-[var(--line-subtle)] flex-none pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </DialogPanel>
    </div>
  </Dialog>
);

export default Modal;
