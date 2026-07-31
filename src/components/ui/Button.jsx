import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import Icon from "./Icon";

const VARIANTS = {
  primary:
    "bg-primary-500 text-white shadow-soft hover:bg-primary-600 active:bg-primary-700 disabled:bg-neutral-300",
  secondary:
    "bg-[var(--surface-sunken)] text-[var(--ink-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-[var(--line-subtle)]",
  ghost:
    "bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink-primary)]",
  danger: "bg-danger-500 text-white hover:bg-red-600 shadow-soft",
  outline:
    "bg-transparent border border-[var(--line-strong)] text-[var(--ink-primary)] hover:bg-[var(--surface-sunken)]",
};

const SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-lg",
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
};

const Button = React.forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      isLoading = false,
      disabled = false,
      className,
      type = "button",
      ...rest
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none transition-colors duration-150",
          "disabled:opacity-55 disabled:cursor-not-allowed",
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...rest}
      >
        {isLoading ? (
          <Icon icon="svg-spinners:180-ring" className="text-[1.1em]" />
        ) : (
          icon && iconPosition === "left" && <Icon icon={icon} className="text-[1.1em] flex-none" />
        )}
        {children}
        {!isLoading && icon && iconPosition === "right" && (
          <Icon icon={icon} className="text-[1.1em] flex-none" />
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export default Button;
