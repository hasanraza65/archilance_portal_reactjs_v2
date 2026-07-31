import React, { useState } from "react";
import { cn } from "@/lib/cn";
import { initials, colorFromString } from "@/lib/format";

const SIZES = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6.5 h-6.5 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-11 h-11 text-sm",
  xl: "w-16 h-16 text-lg",
};

const Avatar = ({ src, name, size = "md", className, ring = false }) => {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center flex-none rounded-full font-semibold text-white overflow-hidden",
        SIZES[size],
        ring && "ring-2 ring-[var(--surface-raised)]",
        className
      )}
      style={!showImg ? { background: colorFromString(name || "?") } : undefined}
      title={name || ""}
    >
      {showImg ? (
        <img
          src={src}
          alt={name || "avatar"}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
};

export default Avatar;
