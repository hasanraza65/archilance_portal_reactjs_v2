import React from "react";
import { cn } from "@/lib/cn";

const Card = ({ children, className, padded = true, hoverable = false, as: Comp = "div", ...rest }) => (
  <Comp
    className={cn(
      "bg-[var(--surface-raised)] border border-[var(--line-subtle)] rounded-card shadow-soft",
      padded && "p-5",
      hoverable && "transition-shadow hover:shadow-card cursor-pointer",
      className
    )}
    {...rest}
  >
    {children}
  </Comp>
);

export default Card;
