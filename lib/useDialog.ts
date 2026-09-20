"use client";

import { useEffect, useRef } from "react";

/**
 * Accesibilidad de diálogos: foco inicial, trampa de Tab, cierre con Escape
 * y restauración del foco al elemento que abrió el diálogo.
 */
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === first || !node.contains(activo))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activo === last || !node.contains(activo))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prev?.focus();
    };
  }, [onClose]);

  return ref;
}
