import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";

/**
 * The "feels intelligent" nudge — small, dismissible, never modal. Appears
 * inline (not as a popup) so status edits stay low-friction for a daily habit.
 */
const SmartSyncBanner = ({ suggestion, onAccept, onDismiss, isApplying = false }) => (
  <AnimatePresence>
    {suggestion && (
      <motion.div
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <div className="flex items-center gap-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 px-3.5 py-2.5">
          <Icon icon="solar:magic-stick-3-bold-duotone" className="text-primary-500 text-[17px] flex-none" />
          <p className="flex-1 text-[13px] text-[var(--ink-primary)] leading-snug">{suggestion.message}</p>
          <button
            type="button"
            onClick={onAccept}
            disabled={isApplying}
            className="flex-none text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {isApplying ? "Updating…" : "Update"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-none w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-tertiary)] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Icon icon="solar:close-circle-linear" className="text-[15px]" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SmartSyncBanner;
