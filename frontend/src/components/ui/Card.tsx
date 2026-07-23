"use client";

import React from "react";
import { cn } from "./cn";

export type CardPadding = "none" | "sm" | "md";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

/** Panel translúcido con borde: el contenedor que ya se repetía en todo el CRM. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-neutral-900/40 border border-neutral-800/60 rounded-2xl backdrop-blur-md",
        PADDING[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";
