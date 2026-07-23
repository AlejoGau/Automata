"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Notificaciones de la app. Reemplaza los alert() nativos y el toast local
 * que vivía dentro de MarketingStudio, para que todo el CRM avise igual.
 *
 * Los estilos usan las clases de Tailwind del proyecto, así el toast también
 * sigue el tema por usuario (orange = color de marca activo).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group bg-neutral-900/95 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-md gap-3",
          title: "text-sm font-semibold text-white",
          description: "text-xs text-neutral-400",
          closeButton:
            "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white",
          actionButton:
            "bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg",
          cancelButton:
            "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg",
          success: "border-emerald-900/60 [&_[data-icon]]:text-emerald-400",
          error: "border-rose-900/60 [&_[data-icon]]:text-rose-400",
          warning: "border-amber-900/60 [&_[data-icon]]:text-amber-400",
          info: "border-orange-900/60 [&_[data-icon]]:text-orange-400",
        },
      }}
    />
  );
}
