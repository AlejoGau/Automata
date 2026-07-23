"use client";

import React from "react";
import { cn } from "./cn";

/** Base compartida por input / textarea / select (el estilo que ya usaba el CRM). */
const CONTROL =
  "w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-500 " +
  "text-sm px-3 py-2 rounded-lg transition-colors " +
  "focus:outline-none focus:border-orange-600 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

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

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(CONTROL, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(CONTROL, "resize-none", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(CONTROL, className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
