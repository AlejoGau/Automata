"use client";

import React from "react";
import { cn } from "./cn";

export type BadgeTone = "brand" | "neutral" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  brand: "bg-orange-950/40 border-orange-900/40 text-orange-400",
  neutral: "bg-neutral-800/50 border-neutral-700/60 text-neutral-400",
  success: "bg-emerald-950/40 border-emerald-900/40 text-emerald-400",
  warning: "bg-amber-950/30 border-amber-900/40 text-amber-300",
  danger: "bg-rose-950/40 border-rose-900/40 text-rose-400",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Pastilla chica de estado/etiqueta. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = "brand", className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border select-none",
        TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
);
Badge.displayName = "Badge";
