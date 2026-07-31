import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Minimal, dependency-free hover tooltip. Renders via a portal so it can never
 * be clipped by an overflow:hidden ancestor (list rows, panels, etc).
 */
const Tooltip = ({ content, children, side = "top", className }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const timerRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const top = side === "bottom" ? rect.bottom + 8 : rect.top - 8;
      setPos({ top, left: rect.left + rect.width / 2 });
      setOpen(true);
    }, 300);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  if (!content) return children;

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex"
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: side === "bottom" ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: side === "bottom" ? -4 : 4 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                transform: `translate(-50%, ${side === "bottom" ? "0" : "-100%"})`,
                zIndex: 9999,
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium shadow-float pointer-events-none whitespace-nowrap",
                "dark:bg-neutral-100 dark:text-neutral-900",
                className
              )}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </span>
  );
};

export default Tooltip;
