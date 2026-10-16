"use client";

import { useRef, useState } from "react";
import { ORDEN_LABEL, type Orden } from "@/lib/orden";
import { useStore } from "@/lib/store";

const ORDENES: Orden[] = ["recientes", "importe"];

/**
 * Chips de orden: una sola opción a la vez (radiogroup). Tab entra al grupo
 * y las flechas cambian de opción, como en las pestañas de abajo.
 */
export function OrdenObras() {
  const { orden, setOrden } = useStore();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Región live siempre montada: el lector confirma el orden nuevo.
  const [anuncio, setAnuncio] = useState("");

  const elegir = (siguiente: Orden) => {
    setOrden(siguiente);
    setAnuncio(`Ordenadas por ${ORDEN_LABEL[siguiente].toLowerCase()}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const actual = ORDENES.indexOf(orden);
    let i: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (actual + 1) % ORDENES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (actual - 1 + ORDENES.length) % ORDENES.length;
    else return;
    e.preventDefault();
    elegir(ORDENES[i]);
    refs.current[i]?.focus();
  };

  return (
    <>
      <div className="filtro-chips" role="radiogroup" aria-label="Ordenar obras" onKeyDown={onKeyDown}>
        {ORDENES.map((o, i) => (
          <button
            key={o}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={orden === o}
            tabIndex={orden === o ? 0 : -1}
            className="filtro-chip"
            onClick={() => elegir(o)}
          >
            {ORDEN_LABEL[o]}
          </button>
        ))}
      </div>
      <div className="sr-only" role="status">
        {anuncio}
      </div>
    </>
  );
}
