import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SCENES } from "./TourScenes";
import { markTourSeen } from "./versionPrefs";

/**
 * The "what's new" tour. Four steps, skippable, fully responsive.
 *
 * Self-contained by design: it renders in a fixed-position portal-ish overlay
 * with its own CSS variables (`--tour-*`) so it looks identical dropped into
 * either app, and cannot inherit or leak either app's styling.
 *
 * Duplicated byte-for-byte in both builds — keep them identical.
 */

const STEPS = [
  {
    eyebrow: "Redesigned",
    title: "One workspace, not five screens",
    body: "Jobs, projects and tasks now live in a single tree you can expand in place. Status, due date and assignees are editable right where you're looking — no modal round-trips.",
    bullets: ["Inline editing everywhere", "List, board, calendar, table & members views", "Every screen is one click deep"],
    accent: "#6d5ef8",
  },
  {
    eyebrow: "Faster",
    title: "It responds the moment you click",
    body: "Changes apply instantly and reconcile with the server in the background. Lists keep their place while data refreshes, so nothing flashes, jumps or reloads under you.",
    bullets: ["Optimistic updates with rollback", "No full-page reloads between screens", "Heavy views cached and reused"],
    accent: "#10b981",
  },
  {
    eyebrow: "Mobile first",
    title: "Actually usable on a phone",
    body: "Filters collapse into a one-tap sheet instead of a wall of controls, forms scroll with their buttons pinned, and the chat composer is where your thumb already is.",
    bullets: ["Bottom sheets for filters and forms", "Touch targets sized for thumbs", "Nothing hidden below the fold"],
    accent: "#f59e0b",
  },
  {
    eyebrow: "New",
    title: "Things the classic app can't do",
    body: "Briefs and checklists on every job and task, a separate client-facing comment thread, internee grading, and a built-in assistant that answers questions about your own work.",
    bullets: ["Client vs internal conversations", "Briefs, checklists & attachments", "Ask the assistant for your tasks"],
    accent: "#ec4899",
  },
];

/** Light/dark-agnostic palette the scenes read from. */
const TOUR_VARS = {
  "--tour-panel": "rgba(255,255,255,0.06)",
  "--tour-card": "rgba(255,255,255,0.12)",
  "--tour-sunken": "rgba(255,255,255,0.08)",
  "--tour-line": "rgba(255,255,255,0.22)",
  "--tour-ink": "#ffffff",
};

const OnboardingTour = ({ open, onClose, onChooseV2, showChooseCta = true }) => {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const stageRef = useRef(null);

  // 3D tilt driven by pointer position (and neutral on touch).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotY = useSpring(useTransform(px, [-0.5, 0.5], [14, -14]), { stiffness: 140, damping: 18 });
  const rotX = useSpring(useTransform(py, [-0.5, 0.5], [-12, 12]), { stiffness: 140, damping: 18 });

  useEffect(() => {
    if (open) { setStep(0); setDir(1); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];
  const Scene = SCENES[step];

  const finish = () => { markTourSeen(); onClose?.(); };
  const next = () => { if (isLast) { finish(); } else { setDir(1); setStep((v) => v + 1); } };
  const prev = () => { if (step > 0) { setDir(-1); setStep((v) => v - 1); } };

  const onPointerMove = (e) => {
    const el = stageRef.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const resetTilt = () => { px.set(0); py.set(0); };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-stretch justify-center overflow-y-auto"
      style={{ ...TOUR_VARS, background: "radial-gradient(120% 100% at 50% 0%, #1b1740 0%, #0b0a1a 60%, #06060f 100%)" }}
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
    >
      {/* drifting aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 w-[46rem] h-[46rem] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${s.accent}55, transparent 68%)` }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-24 w-[38rem] h-[38rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #6d5ef844, transparent 70%)" }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-10 flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between flex-none">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-sm">A</span>
            <span className="text-white/90 font-semibold text-sm">Archilance <span className="text-white/50">· New experience</span></span>
          </div>
          <button
            onClick={finish}
            className="text-white/60 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* body */}
        <div className="flex-1 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 sm:py-10">
          {/* copy */}
          <div className="order-2 lg:order-1">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -28 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase mb-4"
                  style={{ background: `${s.accent}26`, color: s.accent }}
                >
                  {s.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">{s.title}</h2>
                <p className="text-white/65 mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed max-w-lg">{s.body}</p>

                <ul className="mt-5 space-y-2.5">
                  {s.bullets.map((b, i) => (
                    <motion.li
                      key={b}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                      className="flex items-start gap-2.5 text-white/80 text-sm"
                    >
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none"
                        style={{ background: s.accent, boxShadow: `0 0 10px ${s.accent}` }}
                      />
                      {b}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* stage */}
          <div className="order-1 lg:order-2" style={{ perspective: "1200px" }}>
            <motion.div
              ref={stageRef}
              onPointerMove={onPointerMove}
              onPointerLeave={resetTilt}
              style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
              className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Scene />
                </motion.div>
              </AnimatePresence>
            </motion.div>
            <p className="lg:hidden text-center text-white/30 text-[11px] mt-3">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* controls */}
        <div className="flex-none flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 28 : 8,
                  background: i === step ? s.accent : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 h-10 rounded-xl text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            {isLast && showChooseCta && onChooseV2 ? (
              <button
                onClick={() => { markTourSeen(); onChooseV2(); }}
                className="px-5 h-10 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
                style={{ background: s.accent, boxShadow: `0 8px 30px ${s.accent}55` }}
              >
                Try the new version
              </button>
            ) : (
              <button
                onClick={next}
                className="px-5 h-10 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
                style={{ background: s.accent, boxShadow: `0 8px 30px ${s.accent}55` }}
              >
                {isLast ? "Done" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
