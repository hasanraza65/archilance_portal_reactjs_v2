import React from "react";
import { cn } from "@/lib/cn";

const Spinner = ({ size = 20, className }) => (
  <svg
    className={cn("animate-spin text-primary-500", className)}
    style={{ width: size, height: size }}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default Spinner;
