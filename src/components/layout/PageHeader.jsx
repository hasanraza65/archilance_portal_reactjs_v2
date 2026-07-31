import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Consistent per-page title row: title/subtitle + right-aligned actions + optional tabs below.
 *
 * Mobile behaviour (desktop at `sm:` and up is unchanged):
 *  - when `mobileActions` is given, the desktop `actions` toolbar is hidden on
 *    phones and replaced by it, so a page can swap a cramped row of controls
 *    for a compact one instead of letting it wrap into a mess;
 *  - tabs scroll sideways rather than wrapping onto a second line, bleeding to
 *    the screen edge so it reads as swipeable.
 */
const PageHeader = ({ title, subtitle, actions, mobileActions, tabs, className, maxWidth }) => (
  <div className={cn("px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 lg:pt-7", className)}>
    {/* `maxWidth` keeps the title aligned with a width-constrained body and
        centres both, instead of the heading sitting alone on the far left. */}
    <div className={cn("flex flex-wrap items-start justify-between gap-3", maxWidth && `${maxWidth} mx-auto w-full`)}>
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-0 flex-1"
      >
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--ink-primary)] tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">{subtitle}</p>}
      </motion.div>

      {actions && (
        <div className={cn("flex items-center gap-2 flex-wrap", mobileActions && "hidden sm:flex")}>{actions}</div>
      )}
      {mobileActions && <div className="sm:hidden flex items-center gap-1.5 flex-none">{mobileActions}</div>}
    </div>

    {tabs && (
      <div className={cn("mt-3 sm:mt-4 border-b border-[var(--line-subtle)] -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar", maxWidth && `${maxWidth} mx-auto w-full`)}>
        {tabs}
      </div>
    )}
  </div>
);

export default PageHeader;
