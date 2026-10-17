"use client";

import { useRef } from "react";
import { useDragControls, type PanInfo } from "framer-motion";
import { REDISENO_LUMA } from "./flags";

/**
 * Rediseño Luma: las hojas se cierran arrastrando hacia abajo desde el asa o
 * la cabecera (no desde el cuerpo, que hace scroll). Apagado el flag, no
 * añade nada. El cierre con Escape y la X siguen en useDialog y en la hoja.
 */
export function useHojaArrastrable(onClose: () => void) {
  const controls = useDragControls();
  // Mientras la hoja entra no se puede agarrar: un toque detendría la
  // animación de entrada y la dejaría a medio subir.
  const entrando = useRef(true);
  if (!REDISENO_LUMA) return { arrastre: {}, asa: {} };
  return {
    arrastre: {
      drag: "y" as const,
      dragListener: false,
      dragControls: controls,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.9 },
      onAnimationComplete: () => {
        entrando.current = false;
      },
      onDragEnd: (_: unknown, info: PanInfo) => {
        if (info.offset.y > 120 || info.velocity.y > 700) onClose();
      },
    },
    asa: {
      onPointerDown: (e: React.PointerEvent) => {
        // La X y los enlaces de la cabecera siguen siendo pulsables.
        if (entrando.current || (e.target as HTMLElement).closest("button, a")) return;
        controls.start(e);
      },
    },
  };
}
