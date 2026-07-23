"use client";

import React from "react";
import { cn } from "./cn";

/**
 * Botón base del CRM.
 *
 * IMPORTANTE: usa `orange` (primario) y `amber` (secundario) a propósito.
 * Los temas por usuario en globals.css redefinen esas variables de Tailwind,
 * así que el botón se re-skinea solo. No hardcodear hex acá.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-md shadow-orange-500/15",
  secondary:
    "bg-neutral-800/60 border border-neutral-700 text-neutral-200 hover:bg-neutral-700/60 hover:text-white",
  ghost:
    "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50",
  danger:
    "bg-rose-600/90 hover:bg-rose-500 text-white",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
