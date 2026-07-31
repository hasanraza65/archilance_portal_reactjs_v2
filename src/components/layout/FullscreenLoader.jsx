import React from "react";
import { motion } from "framer-motion";

const FullscreenLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-app)] z-[100]">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-soft">
        A
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  </div>
);

export default FullscreenLoader;
