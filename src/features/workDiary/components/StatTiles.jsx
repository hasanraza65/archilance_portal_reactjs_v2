import React from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { formatDuration } from "@/lib/format";

const TILES = [
  { key: "worked", label: "Total Worked", icon: "solar:clock-circle-bold-duotone", color: "#6d5ef8" },
  { key: "productive", label: "Productive Time", icon: "solar:graph-up-bold-duotone", color: "#10b981" },
  { key: "idle", label: "Idle Time", icon: "solar:moon-sleep-bold-duotone", color: "#f59e0b" },
  { key: "productivity", label: "Productivity", icon: "solar:cpu-bolt-bold-duotone", color: "#4f46e5", isPercent: true },
];

const StatTiles = ({ workedSeconds, idleSeconds, productiveSeconds, productivePercent }) => {
  const values = { worked: workedSeconds, productive: productiveSeconds, idle: idleSeconds, productivity: productivePercent };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {TILES.map((tile, i) => (
        <motion.div
          key={tile.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
          className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${tile.color} 15%, transparent)` }}>
              <Icon icon={tile.icon} className="text-[15px]" style={{ color: tile.color }} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">{tile.label}</span>
          </div>
          <p className="text-xl font-bold text-[var(--ink-primary)]">
            {tile.isPercent ? `${values[tile.key] || 0}%` : formatDuration(values[tile.key])}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatTiles;
