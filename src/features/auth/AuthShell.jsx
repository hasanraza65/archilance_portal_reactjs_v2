import React from "react";
import { motion } from "framer-motion";

/**
 * The split-screen frame shared by every unauthenticated page (sign in, forgot
 * password). Lives in one place so the two screens can never drift apart —
 * pass the form as children and the copy via `headline` / `sub`.
 */
const AuthShell = ({ children, headline, sub }) => (
  <div className="min-h-screen flex bg-[var(--surface-app)] overflow-hidden">
    {/* Left — brand / visual panel (hidden on mobile) */}
    <div className="hidden lg:flex lg:w-[46%] relative bg-neutral-950 text-white overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #6d5ef8, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-8rem] right-[-6rem] w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #ff6f43, transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-bold">A</div>
          <span className="font-semibold tracking-tight">Archilance Portal</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h1 className="text-4xl font-bold leading-tight max-w-md">{headline}</h1>
          <p className="text-white/60 mt-4 max-w-sm">{sub}</p>
        </motion.div>

        <div className="text-xs text-white/40">© {new Date().getFullYear()} Archilance LLC</div>
      </div>
    </div>

    {/* Right — form panel */}
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center font-bold">A</div>
          <span className="font-semibold text-[var(--ink-primary)]">Archilance Portal</span>
        </div>
        {children}
      </motion.div>
    </div>
  </div>
);

export default AuthShell;
