"use client";

import { useState } from "react";
import type { Obra } from "@/lib/obras";
import { SENALES, SENAL_LABEL, type Senal } from "@/lib/senal";
import { useStore } from "@/lib/store";
import { MINIMO_PARA_MOSTRAR, total } from "@/lib/recuento";
import { useRecuento } from "@/lib/useRecuento";

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
  const recuento = useRecuento(obra.id);
  const otras = recuento.estado === "ok" ? recuento.datos.senales : null;
  const n = otras ? total(otras) : 0;

  if (obra.estadoEjecucion !== "faltante") return null;

  const responder = (senal: Senal) => {
    responderSenal(obra.id, senal);
    setAnuncio(`Respuesta guardada: ${SENAL_LABEL[senal]}.`);
  };

  return (
    <section className="ficha-seccion capa-vecinos" aria-labelledby="senal-titulo">
      <h3 id="senal-titulo">Lo dicen los vecinos · dato alegado, no oficial</h3>
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
      {otras && n >= MINIMO_PARA_MOSTRAR && (
        <p className="senal-otros">
          Han respondido {n} vecinos.{" "}
          {SENALES.filter((s) => otras[s] > 0)
            .map((s) => `${SENAL_LABEL[s]}, ${otras[s]}`)
            .join(" · ")}
          .
        </p>
      )}
      <p className="senal-nota">
        Tu respuesta se suma de forma anónima a la de otros vecinos y no cambia el dato oficial.
      </p>
    </section>
  );
}
