import React from "react";
import { cn } from "@/lib/cn";

export const Skeleton = ({ className }) => (
  <div className={cn("skeleton rounded-md", className)} />
);

export const SkeletonText = ({ lines = 3, className }) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
    ))}
  </div>
);

export const SkeletonRow = ({ className }) => (
  <div className={cn("flex items-center gap-3 p-3", className)}>
    <Skeleton className="w-8 h-8 rounded-full flex-none" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  </div>
);

export const SkeletonCard = ({ className }) => (
  <div className={cn("p-5 rounded-card border border-[var(--line-subtle)] space-y-3", className)}>
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-4/5" />
  </div>
);
