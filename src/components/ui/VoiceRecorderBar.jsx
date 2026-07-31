import React from "react";
import { motion } from "framer-motion";
import Icon from "./Icon";
import { formatRecordingTime } from "@/hooks/useVoiceRecorder";

const BARS = 18;

/** WhatsApp-style in-composer recording bar: cancel · live waveform · timer · send. */
const VoiceRecorderBar = ({ seconds, level, onCancel, onSend }) => (
  <div className="flex items-center gap-3 w-full px-3 h-11 rounded-xl bg-[var(--surface-sunken)] border border-[var(--line-subtle)]">
    <button
      type="button"
      onClick={onCancel}
      className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-danger-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
      title="Cancel recording"
    >
      <Icon icon="solar:trash-bin-trash-linear" className="text-[15px]" />
    </button>

    <span className="flex-none flex items-center gap-1.5 text-danger-500">
      <motion.span
        className="w-2 h-2 rounded-full bg-danger-500"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <span className="text-xs font-semibold tabular-nums">{formatRecordingTime(seconds)}</span>
    </span>

    <div className="flex-1 flex items-center justify-center gap-[3px] h-6 overflow-hidden">
      {Array.from({ length: BARS }).map((_, i) => {
        // Center bars react a bit more strongly than the edges.
        const weight = 1 - Math.abs(i - BARS / 2) / (BARS / 1.4);
        const h = 4 + level * 20 * Math.max(0.25, weight) * (0.65 + ((i * 37) % 10) / 14);
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-primary-400"
            animate={{ height: Math.max(4, Math.min(22, h)) }}
            transition={{ duration: 0.12 }}
          />
        );
      })}
    </div>

    <button
      type="button"
      onClick={onSend}
      className="flex-none w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
      title="Send voice message"
    >
      <Icon icon="solar:plain-2-bold" className="text-[15px]" />
    </button>
  </div>
);

export default VoiceRecorderBar;
