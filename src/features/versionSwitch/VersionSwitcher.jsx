import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Header control for moving between the classic app and the new one.
 *
 * `side` says which app it's rendered in, so the same component serves both:
 *   side="classic" -> offers "Try the new experience"
 *   side="v2"      -> offers "Back to classic"
 *
 * Duplicated byte-for-byte in both builds — keep them identical.
 */
const VersionSwitcher = ({ side, onSwitch, onOpenTour, compact = false }) => {
  const [open, setOpen] = useState(false);
  const isClassic = side === "classic";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={isClassic ? "Try the new experience" : "Switch version"}
        className="group inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:pl-2.5 sm:pr-2 rounded-full border transition-colors flex-none"
        style={{
          borderColor: isClassic ? "rgba(109,94,248,0.45)" : "rgba(255,255,255,0.16)",
          background: isClassic ? "rgba(109,94,248,0.10)" : "rgba(109,94,248,0.14)",
        }}
      >
        {/* Icon-only below sm. The classic header's brand is a fixed-width
            heading that can't shrink, so a labelled pill collided with it on a
            phone. The sparkle keeps the affordance without the width. */}
        <span className="relative flex items-center justify-center sm:hidden">
          <motion.span
            animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0.15, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 -m-1 rounded-full"
            style={{ background: "#6d5ef8" }}
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative" style={{ color: "#6d5ef8" }}>
            <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" fill="currentColor" />
            <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill="currentColor" opacity="0.75" />
          </svg>
        </span>

        <motion.span
          animate={{ scale: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full flex-none hidden sm:block"
          style={{ background: "#6d5ef8" }}
        />
        <span className="text-[12.5px] font-semibold whitespace-nowrap hidden sm:inline" style={{ color: "#6d5ef8" }}>
          {compact ? (isClassic ? "New" : "v2") : isClassic ? "Try new UI" : "New UI"}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-60 hidden sm:block" style={{ color: "#6d5ef8" }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* click-away catcher */}
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              role="menu"
              className="absolute right-0 top-full mt-2 z-[71] w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden shadow-2xl border"
              style={{ background: "#14131f", borderColor: "rgba(255,255,255,0.12)" }}
            >
              <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-white font-semibold text-sm">
                  {isClassic ? "A new Archilance is here" : "You're on the new experience"}
                </p>
                <p className="text-white/50 text-[11.5px] mt-0.5 leading-snug">
                  {isClassic
                    ? "Faster, mobile-ready, and with features the classic app doesn't have."
                    : "Switch back any time — nothing you do here is lost."}
                </p>
              </div>

              <div className="p-2 space-y-1">
                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); onSwitch(); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-colors hover:bg-white/[0.07]"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                    style={{ background: "rgba(109,94,248,0.18)" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: "#6d5ef8" }}>
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-white text-[13px] font-semibold">
                      {isClassic ? "Switch to the new UI" : "Back to Classic"}
                    </span>
                    <span className="block text-white/45 text-[11px]">Keeps you on this same page</span>
                  </span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => { setOpen(false); onOpenTour(); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-colors hover:bg-white/[0.07]"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center flex-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/70">
                      <path d="M12 16v-4M12 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-white text-[13px] font-semibold">What's new</span>
                    <span className="block text-white/45 text-[11px]">A quick 4-step tour</span>
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VersionSwitcher;
