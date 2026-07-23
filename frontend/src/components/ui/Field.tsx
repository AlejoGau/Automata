"use client";

import React from "react";
import { cn } from "./cn";

/**
 * Base compartida por input / textarea / select.
 *
 * Dos tamaños porque la app ya usaba los dos:
 *  - sm: campos densos (editor de escenas del Video Studio)
 *  - md: formularios principales (Marketing Studio, Mi Marca)
 */
export type FieldSize = "sm" | "md";

const BASE =
  "w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 " +
  "text-sm transition-colors focus:outline-none focus:border-orange-600 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const SIZES: Record<FieldSize, string> = {
  sm: "px-3 py-2 rounded-lg",
  md: "px-4 py-3 rounded-xl",
};

const control = (size: FieldSize, className?: string) => cn(BASE, SIZES[size], className);

/** Etiqueta chica en mayúsculas que ya se usaba arriba de cada campo. */
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1",
      className
    )}
    {...props}
  >
    {children}
  </label>
));
Label.displayName = "Label";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fieldSize?: FieldSize;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ fieldSize = "sm", className, ...props }, ref) => (
    <input ref={ref} className={control(fieldSize, className)} {...props} />
  )
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fieldSize?: FieldSize;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ fieldSize = "sm", className, ...props }, ref) => (
    <textarea ref={ref} className={control(fieldSize, cn("resize-none", className))} {...props} />
  )
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fieldSize?: FieldSize;
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ fieldSize = "sm", className, children, ...props }, ref) => (
    <select ref={ref} className={control(fieldSize, className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
