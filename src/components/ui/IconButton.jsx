import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import Icon from "./Icon";

const SIZES = {
  xs: "w-6 h-6 text-[13px] rounded-md",
  sm: "w-8 h-8 text-[15px] rounded-lg",
  md: "w-9 h-9 text-[17px] rounded-lg",
  lg: "w-11 h-11 text-[19px] rounded-xl",
};

const VARIANTS = {
  ghost: "text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)]",
  solid: "bg-[var(--surface-sunken)] text-[var(--ink-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800",
  primary: "bg-primary-500 text-white hover:bg-primary-600",
  danger: "text-danger-500 hover:bg-red-50 dark:hover:bg-red-500/10",
};

const IconButton = React.forwardRef(
  ({ icon, size = "md", variant = "ghost", className, active, label, ...rest }, ref) => (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center flex-none transition-colors duration-150",
        SIZES[size],
        VARIANTS[variant],
        active && "bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
        className
      )}
      {...rest}
    >
      <Icon icon={icon} />
    </motion.button>
  )
);
IconButton.displayName = "IconButton";

export default IconButton;
