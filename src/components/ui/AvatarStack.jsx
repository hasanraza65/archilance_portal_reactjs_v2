import React from "react";
import Avatar from "./Avatar";
import { cn } from "@/lib/cn";

/** Overlapping avatar stack (assignees) with a "+N" overflow bubble. */
const AvatarStack = ({ people = [], max = 4, size = "sm", className }) => {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((p, i) => (
        <Avatar
          key={p.id ?? i}
          src={p.avatar}
          name={p.name}
          size={size}
          ring
          className="hover:z-10 hover:scale-110 transition-transform"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "relative inline-flex items-center justify-center flex-none rounded-full font-semibold ring-2 ring-[var(--surface-raised)] bg-[var(--surface-sunken)] text-[var(--ink-secondary)]",
            size === "sm" ? "w-6.5 h-6.5 text-[10px]" : "w-8 h-8 text-xs"
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};

export default AvatarStack;
