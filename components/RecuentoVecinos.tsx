"use client";

import { VOTO_LABEL, type Obra } from "@/lib/obras";
import { MINIMO_PARA_MOSTRAR, VOTOS, total } from "@/lib/recuento";
import { useRecuento } from "@/lib/useRecuento";

/**
 * «Lo que votan los vecinos»: el recuento anónimo de esta obra. Es opinión de
 * quien usa ¿VALIÓ?, no una encuesta, y así lo dice. Con menos de
 * MINIMO_PARA_MOSTRAR votos solo se da el total: un reparto de dos votos
 * engaña más que informa.
 */
export function RecuentoVecinos({ obra }: { obra: Obra }) {
  const r = useRecuento(obra.id);
  if (r.estado === "sin_servicio") return null;

  const votos = r.estado === "ok" ? r.datos.votos : null;
  const n = votos ? total(votos) : 0;

  return (
    <section className="ficha-seccion recuento-vecinos" aria-labelledby="recuento-titulo">
      <h3 id="recuento-titulo">Lo que votan los vecinos</h3>
      {r.estado === "cargando" ? (
        <p className="senal-nota">Cargando votos…</p>
      ) : n < MINIMO_PARA_MOSTRAR ? (
        <p className="recuento-pocos">
          {n === 0 ? "Aún nadie ha votado esta obra." : `${n} ${n === 1 ? "voto" : "votos"} por ahora.`} El reparto se
          enseña a partir de {MINIMO_PARA_MOSTRAR}.
        </p>
      ) : (
        <ul className="recuento-barras">
          {VOTOS.map((v) => {
            const pct = Math.round((votos![v] / n) * 100);
            return (
              <li key={v} data-voto={v}>
                <span className="recuento-etiqueta">{VOTO_LABEL[v]}</span>
                <span className="recuento-barra" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="recuento-cifra num">
                  {pct} % <small>({votos![v]})</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="senal-nota">
        {n >= MINIMO_PARA_MOSTRAR ? `${n} votos anónimos. ` : ""}Es la opinión de quien usa ¿VALIÓ?, no una encuesta, y
        no representa a todo el municipio.
      </p>
    </section>
  );
}
