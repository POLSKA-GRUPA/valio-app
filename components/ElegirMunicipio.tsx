"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { MUNICIPIOS } from "@/lib/municipios";
import { OBRAS } from "@/lib/obras";
import { eurosCompactos } from "@/lib/formato";
import { importeDe } from "@/lib/orden";
import { REDISENO_LUMA } from "@/lib/flags";
import { IconoTipo, slugTipo } from "./TipoObra";

/**
 * Rediseño Luma: bienvenida con las tres obras de mayor importe en abanico
 * (como «Get Started» de Luma). Datos reales de lib/obras.ts; decorativo
 * para el lector, que ya tiene la pregunta y la lista.
 */
function Abanico() {
  const tres = [...OBRAS].sort((a, b) => importeDe(b) - importeDe(a)).slice(0, 3);
  // Orden visual: la segunda a la izquierda, la mayor en el centro, la tercera a la derecha.
  const colocadas = [tres[1], tres[0], tres[2]].filter(Boolean);
  return (
    <div className="abanico" aria-hidden="true">
      {colocadas.map((o, i) => (
        <div key={o.id} className={`mini-poster${i === 1 ? "" : " lado"}`} data-cat={slugTipo(o.categoria)} data-i={i}>
          <IconoTipo categoria={o.categoria} size={120} className="poster-marca" />
          <small>{o.anyo}</small>
          <b className="num">{eurosCompactos(importeDe(o))}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * Primera pantalla: las obras municipales solo las juzga quien vive allí.
 * Sin GPS ni ubicación precisa: basta con el municipio (dossier §8.4).
 */
export function ElegirMunicipio({ onElegir }: { onElegir: (nombre: string) => void }) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // El lector empieza por la pregunta, no por el primer botón.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <section className="panel municipio-panel" aria-labelledby="municipio-titulo">
      {REDISENO_LUMA && <Abanico />}
      <h2 id="municipio-titulo" className="panel-title display" tabIndex={-1} ref={tituloRef}>
        ¿Dónde vives?
      </h2>
      <p className="panel-intro">
        Elige tu municipio para ver sus obras. Solo te preguntamos el municipio: nunca tu ubicación. Se guarda
        en este dispositivo.
      </p>
      <ul className="municipio-lista">
        {MUNICIPIOS.map((m) => (
          <li key={m.nombre}>
            <button type="button" className="btn municipio-btn" onClick={() => onElegir(m.nombre)}>
              {REDISENO_LUMA && (
                <span className="municipio-punto" aria-hidden="true">
                  <MapPin size={20} />
                </span>
              )}
              <span className="municipio-nombre">{m.nombre}</span>
              <span className="municipio-detalle">
                {m.provincia} · {m.numObras} {m.numObras === 1 ? "obra" : "obras"}
              </span>
              {REDISENO_LUMA && <ChevronRight className="municipio-flecha" size={20} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
