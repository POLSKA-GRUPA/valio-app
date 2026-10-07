"use client";

import { useState } from "react";
import { CATEGORIA_LABEL, type Categoria } from "@/lib/obras";
import { useStore } from "@/lib/store";

/**
 * Chips de tipo encima del mazo. Se pueden marcar varios; «Todas» los quita.
 * Solo salen los tipos que tienen obras en el municipio elegido.
 */
export function FiltroTipos() {
  const { obras, votos, tipos, alternarTipo, verTodosLosTipos } = useStore();
  // Región live siempre montada: el lector anuncia cuántas quedan al filtrar.
  const [anuncio, setAnuncio] = useState("");

  const disponibles = (Object.keys(CATEGORIA_LABEL) as Categoria[])
    .map((tipo) => ({ tipo, total: obras.filter((o) => o.categoria === tipo).length }))
    .filter((t) => t.total > 0);

  const anunciar = (siguiente: Categoria[]) => {
    const quedan = obras.filter(
      (o) => !votos[o.id] && (siguiente.length === 0 || siguiente.includes(o.categoria)),
    ).length;
    const cuales = siguiente.length === 0 ? "todos los tipos" : siguiente.map((t) => CATEGORIA_LABEL[t]).join(", ");
    setAnuncio(`${quedan} ${quedan === 1 ? "obra pendiente" : "obras pendientes"}: ${cuales}`);
  };

  const onTodas = () => {
    verTodosLosTipos();
    anunciar([]);
  };

  const onTipo = (tipo: Categoria) => {
    alternarTipo(tipo);
    anunciar(tipos.includes(tipo) ? tipos.filter((t) => t !== tipo) : [...tipos, tipo]);
  };

  return (
    <div className="filtro-tipos">
      <div className="filtro-chips" role="group" aria-label="Filtrar por tipo de obra">
        <button type="button" className="filtro-chip" aria-pressed={tipos.length === 0} onClick={onTodas}>
          Todas
        </button>
        {disponibles.map(({ tipo, total }) => (
          <button
            key={tipo}
            type="button"
            className="filtro-chip"
            aria-pressed={tipos.includes(tipo)}
            aria-label={`${CATEGORIA_LABEL[tipo]}, ${total} ${total === 1 ? "obra" : "obras"}`}
            onClick={() => onTipo(tipo)}
          >
            {CATEGORIA_LABEL[tipo]} <span aria-hidden="true">· {total}</span>
          </button>
        ))}
      </div>
      <div className="sr-only" role="status">
        {anuncio}
      </div>
    </div>
  );
}
