import React from "react";
import { motion } from "framer-motion";

/**
 * Animated SVG scenes for the onboarding tour.
 *
 * Hand-drawn vectors rather than screenshots, so they stay crisp at any size,
 * weigh nothing, and — the real reason — their layers can move independently.
 * Each scene is built from depth planes that the parent tilts in 3D on
 * pointer-move, which is what sells the effect.
 *
 * Colours come from the host app's CSS variables, so a scene looks right in
 * either app and in light or dark mode without a second copy.
 */

const ease = [0.16, 1, 0.3, 1];

/** Shared plane wrapper: `depth` 0 sits flat, higher floats further forward. */
const Plane = ({ depth = 0, children, className = "" }) => (
  <div
    className={`absolute inset-0 ${className}`}
    style={{ transform: `translateZ(${depth * 18}px)`, transformStyle: "preserve-3d" }}
  >
    {children}
  </div>
);

const cardIn = (i) => ({
  initial: { opacity: 0, y: 18, rotateX: -12 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: { duration: 0.5, delay: 0.1 + i * 0.09, ease },
});

/* ------------------------------------------------------------------ */
/* 1. A workspace that finally feels like one product                  */
/* ------------------------------------------------------------------ */
export const SceneWorkspace = () => (
  <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
    <Plane depth={0}>
      <div className="absolute inset-x-[8%] top-[12%] bottom-[10%] rounded-2xl bg-[var(--tour-panel)] border border-[var(--tour-line)] shadow-2xl" />
    </Plane>

    {/* sidebar */}
    <Plane depth={1}>
      <motion.div
        {...cardIn(0)}
        className="absolute left-[10%] top-[15%] bottom-[13%] w-[18%] rounded-xl bg-[var(--tour-sunken)] p-2 space-y-1.5"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.07, duration: 0.35, ease }}
            className={`h-2 rounded-full ${i === 1 ? "bg-[var(--tour-accent)]" : "bg-[var(--tour-line)]"}`}
            style={{ width: `${60 + (i % 3) * 14}%` }}
          />
        ))}
      </motion.div>
    </Plane>

    {/* task cards */}
    <Plane depth={2}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          {...cardIn(i + 1)}
          className="absolute rounded-xl bg-[var(--tour-card)] border border-[var(--tour-line)] shadow-lg p-2.5"
          style={{ left: "31%", right: "11%", top: `${19 + i * 21}%`, height: "17%" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ background: "var(--tour-accent)", opacity: 0.85 - i * 0.2 }} />
            <div className="h-2 rounded-full bg-[var(--tour-line)] flex-1" style={{ maxWidth: `${70 - i * 12}%` }} />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 320, damping: 18 }}
              className="ml-auto px-2 py-0.5 rounded-full text-[7px] font-bold text-white"
              style={{ background: ["#10b981", "#f59e0b", "#6d5ef8"][i] }}
            >
              {["Done", "Active", "New"][i]}
            </motion.div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--tour-line)]" style={{ width: `${85 - i * 15}%` }} />
        </motion.div>
      ))}
    </Plane>

    {/* floating cursor */}
    <Plane depth={3}>
      <motion.div
        initial={{ opacity: 0, x: 40, y: 60 }}
        animate={{ opacity: 1, x: [40, 10, 24], y: [60, 30, 44] }}
        transition={{ delay: 0.9, duration: 2.4, ease, repeat: Infinity, repeatType: "reverse" }}
        className="absolute left-[52%] top-[30%]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 2l6.5 18 2.2-7.3L20 10.5 4 2z" fill="var(--tour-accent)" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </Plane>
  </div>
);

/* ------------------------------------------------------------------ */
/* 2. Speed                                                            */
/* ------------------------------------------------------------------ */
export const SceneSpeed = () => (
  <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
    <Plane depth={0}>
      <div className="absolute inset-x-[10%] top-[14%] bottom-[12%] rounded-2xl bg-[var(--tour-panel)] border border-[var(--tour-line)] shadow-2xl" />
    </Plane>

    <Plane depth={1.5}>
      {/* bars racing up */}
      <div className="absolute left-[16%] right-[16%] bottom-[22%] flex items-end gap-[4%] h-[46%]">
        {[38, 62, 45, 88, 70, 96].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: "6%", opacity: 0 }}
            animate={{ height: `${h}%`, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.65, ease }}
            className="flex-1 rounded-t-md"
            style={{
              background: i === 5 ? "var(--tour-accent)" : "var(--tour-line)",
              boxShadow: i === 5 ? "0 0 22px var(--tour-accent)" : "none",
            }}
          />
        ))}
      </div>
    </Plane>

    <Plane depth={3}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 16 }}
        className="absolute left-1/2 -translate-x-1/2 top-[20%] px-3 py-1.5 rounded-full bg-[var(--tour-card)] border border-[var(--tour-line)] shadow-xl flex items-center gap-1.5"
      >
        <motion.span
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
        />
        <span className="text-[9px] font-bold text-[var(--tour-ink)]">Instant</span>
      </motion.div>
    </Plane>

    {/* speed streaks */}
    <Plane depth={2}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ x: "-30%", opacity: 0 }}
          animate={{ x: "130%", opacity: [0, 0.9, 0] }}
          transition={{ delay: 0.4 + i * 0.35, duration: 1.1, repeat: Infinity, repeatDelay: 1.3, ease: "easeOut" }}
          className="absolute h-[2px] rounded-full"
          style={{ top: `${30 + i * 9}%`, width: "22%", background: "var(--tour-accent)", opacity: 0.5 }}
        />
      ))}
    </Plane>
  </div>
);

/* ------------------------------------------------------------------ */
/* 3. Built for the phone                                              */
/* ------------------------------------------------------------------ */
export const SceneMobile = () => (
  <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
    <Plane depth={0}>
      <motion.div
        initial={{ opacity: 0, rotateY: -18, y: 16 }}
        animate={{ opacity: 1, rotateY: 0, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="absolute left-1/2 -translate-x-1/2 top-[8%] bottom-[8%] w-[38%] rounded-[1.4rem] bg-[var(--tour-panel)] border-2 border-[var(--tour-line)] shadow-2xl overflow-hidden"
      >
        <div className="h-4 flex items-center justify-center">
          <span className="w-8 h-1 rounded-full bg-[var(--tour-line)]" />
        </div>
        <div className="px-2 space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4, ease }}
              className="rounded-lg bg-[var(--tour-card)] border border-[var(--tour-line)] p-1.5 flex items-center gap-1.5"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[var(--tour-accent)]" style={{ opacity: 0.8 - i * 0.15 }} />
              <div className="h-1.5 rounded-full bg-[var(--tour-line)] flex-1" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Plane>

    {/* filter sheet sliding up */}
    <Plane depth={2}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: ["100%", "0%", "0%", "100%"] }}
        transition={{ duration: 4, times: [0, 0.28, 0.75, 1], repeat: Infinity, ease }}
        className="absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[38%] rounded-t-2xl bg-[var(--tour-card)] border border-[var(--tour-line)] shadow-2xl p-2"
      >
        <div className="flex justify-center mb-1.5">
          <span className="w-7 h-1 rounded-full bg-[var(--tour-line)]" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3.5 rounded-md"
              style={{ background: i === 0 ? "var(--tour-accent)" : "var(--tour-sunken)" }}
            />
          ))}
        </div>
      </motion.div>
    </Plane>

    {/* thumb */}
    <Plane depth={3}>
      <motion.div
        animate={{ y: [8, -6, 8], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[16%] bottom-[22%] w-6 h-6 rounded-full border-2 border-[var(--tour-accent)]"
        style={{ background: "color-mix(in srgb, var(--tour-accent) 22%, transparent)" }}
      />
    </Plane>
  </div>
);

/* ------------------------------------------------------------------ */
/* 4. New capabilities                                                 */
/* ------------------------------------------------------------------ */
const FEATURE_DOTS = [
  { label: "Briefs", x: 16, y: 22, c: "#6d5ef8" },
  { label: "Checklists", x: 60, y: 14, c: "#10b981" },
  { label: "Client chat", x: 70, y: 58, c: "#f59e0b" },
  { label: "Grading", x: 20, y: 62, c: "#ec4899" },
  { label: "Assistant", x: 44, y: 40, c: "#3b82f6" },
];

export const SceneFeatures = () => (
  <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
    <Plane depth={0}>
      <div className="absolute inset-x-[9%] top-[12%] bottom-[10%] rounded-2xl bg-[var(--tour-panel)] border border-[var(--tour-line)] shadow-2xl" />
    </Plane>

    {/* connecting lines */}
    <Plane depth={1}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {FEATURE_DOTS.filter((d) => d.label !== "Assistant").map((d, i) => (
          <motion.line
            key={i}
            x1="44" y1="40" x2={d.x} y2={d.y}
            stroke="var(--tour-accent)"
            strokeWidth="0.4"
            strokeDasharray="2 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.45 }}
            transition={{ delay: 0.4 + i * 0.12, duration: 0.7, ease }}
          />
        ))}
      </svg>
    </Plane>

    <Plane depth={2.5}>
      {FEATURE_DOTS.map((d, i) => (
        <motion.div
          key={d.label}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 + i * 0.11, type: "spring", stiffness: 300, damping: 17 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--tour-card)] border border-[var(--tour-line)] shadow-lg whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: d.c }} />
            <span className="text-[8px] font-bold text-[var(--tour-ink)]">{d.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </Plane>
  </div>
);

export const SCENES = [SceneWorkspace, SceneSpeed, SceneMobile, SceneFeatures];
