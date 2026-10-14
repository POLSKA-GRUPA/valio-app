"use client";

import { useState } from "react";
import type { Obra } from "@/lib/obras";
import { SENALES, SENAL_LABEL, type Senal } from "@/lib/senal";
import { useStore } from "@/lib/store";

/**
 * «¿Sabes si está terminada?» (ISSUE-43). Solo aparece si la fuente oficial
 * no dice el estado de ejecución. Lo que responde el vecino es un dato
 * ALEGADO: va en su propio bloque, con su rótulo, y nunca se mezcla con
 * «Los documentos dicen».
 */
export function SenalVecinal({ obra }: { obra: Obra }) {
  const { senales, responderSenal } = useStore();
  const actual = senales[obra.id];
  // Texto de la región live. Arranca con la respuesta guardada (el lector no
  // anuncia lo que ya estaba) y cambia al responder, que es lo que se anuncia.
  const [anuncio, setAnuncio] = useState(actual ? `Tu respuesta: ${SENAL_LABEL[actual]}.` : "");

  if (obra.estadoEjecucion !== "faltante") return null;

  const responder = (senal: Senal) => {
    responderSenal(obra.id, senal);
    setAnuncio(`Respuesta guardada: ${SENAL_LABEL[senal]}.`);
  };

  return (
    <section className="capa capa-vecinos" aria-labelledby="senal-titulo">
      <h3 id="senal-titulo">Lo dicen los vecinos · no verificado</h3>
      <p className="senal-pregunta" id="senal-pregunta">
        ¿Sabes si está terminada?
      </p>
      <div className="senal-opciones" role="group" aria-labelledby="senal-pregunta">
        {SENALES.map((s) => (
          <button
            key={s}
            type="button"
            className="senal-btn"
            aria-pressed={actual === s}
            onClick={() => responder(s)}
          >
            {SENAL_LABEL[s]}
          </button>
        ))}
      </div>
      {/* Siempre montada: el lector solo anuncia cambios en una región que ya existía. */}
      <p className="senal-estado" role="status">
        {anuncio}
      </p>
      <p className="senal-nota">
        Tu respuesta se guarda solo en este dispositivo y no cambia el dato oficial.
      </p>
    </section>
  );
}
