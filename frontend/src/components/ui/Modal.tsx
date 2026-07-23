"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "./cn";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export type ModalSize = keyof typeof SIZES;

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Título del header estándar. Acepta JSX para headers con íconos/badges. Si se omite, no se renderiza header. */
  title?: React.ReactNode;
  size?: ModalSize;
  /** En false bloquea todo cierre (Escape, backdrop y botón X). Ej: mientras se está enviando. */
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  /** Clases del panel (la tarjeta). */
  className?: string;
  /** Clases del overlay (por ej. un z-index distinto). */
  overlayClassName?: string;
  children: React.ReactNode;
}

/**
 * Modal accesible: cierra con Escape, atrapa el foco (Tab no se escapa al fondo),
 * devuelve el foco al elemento que lo abrió y se anuncia como diálogo a lectores
 * de pantalla. Se renderiza por portal para no pelear con stacking contexts.
 */
export function Modal({
  open,
  onClose,
  title,
  size = "md",
  dismissible = true,
  closeOnBackdrop = true,
  className,
  overlayClassName,
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  // Si el usuario pidió menos movimiento, no animamos (igual que hace el CSS del proyecto).
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  // Al abrir: recordar quién tenía el foco y moverlo adentro.
  // Al cerrar: devolverlo. Sin esto el teclado queda "perdido" atrás del modal.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (!dismissible) return;
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const nodes = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    ).filter((el) => el.offsetParent !== null);
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  // Misma curva que las animaciones CSS del proyecto, para que se sienta parejo.
  const EASE = [0.22, 1, 0.36, 1] as const;
  const dur = reduceMotion ? 0 : 0.18;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
            overlayClassName
          )}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            // Solo cierra si el click empezó en el fondo, no al arrastrar desde adentro.
            if (!closeOnBackdrop || !dismissible) return;
            if (e.target === e.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              "bg-neutral-900 border border-neutral-800 rounded-2xl w-full shadow-2xl outline-none",
              SIZES[size],
              className
            )}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: dur, ease: EASE }}
          >
            {title && (
              <div className="flex justify-between items-center gap-3 px-6 py-4 border-b border-neutral-800 shrink-0">
                <h3 id={titleId} className="font-bold text-white flex items-center gap-2">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!dismissible}
                  aria-label="Cerrar"
                  className="text-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
