import React from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { cn } from "@/lib/cn";

/**
 * Slide-over panel. Desktop: docks to the right at a fixed width (task detail,
 * filters, etc). Mobile: becomes a full-screen sheet for a native-app feel.
 * `widthClass` only applies at the sm: breakpoint and above.
 */
const Sheet = ({ open, onClose, children, widthClass = "sm:max-w-xl", className }) => (
  <Dialog open={open} onClose={onClose} transition className="relative z-50">
    <div
      className="fixed inset-0 bg-[var(--surface-overlay)] backdrop-blur-[2px] transition duration-200 data-[closed]:opacity-0"
      aria-hidden="true"
    />
    <div className="fixed inset-0 flex justify-end">
      <DialogPanel
        transition
        className={cn(
          "w-full h-full bg-[var(--surface-raised)] shadow-float flex flex-col",
          "sm:border-l sm:border-[var(--line-subtle)]",
          "transition duration-250 ease-out data-[closed]:translate-x-full",
          widthClass,
          className
        )}
      >
        {children}
      </DialogPanel>
    </div>
  </Dialog>
);

export default Sheet;
