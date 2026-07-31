import React from "react";
import { motion } from "framer-motion";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

const EmptyState = ({ icon = "solar:inbox-linear", title, description, action, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}
  >
    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-sunken)] flex items-center justify-center mb-4">
      <Icon icon={icon} className="text-2xl text-[var(--ink-tertiary)]" />
    </div>
    <h3 className="font-semibold text-[var(--ink-primary)] mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-[var(--ink-secondary)] max-w-sm mb-4">{description}</p>
    )}
    {action}
  </motion.div>
);

export default EmptyState;
