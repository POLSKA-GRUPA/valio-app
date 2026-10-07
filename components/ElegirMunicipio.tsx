"use client";

import { useEffect, useRef } from "react";
import { MUNICIPIOS } from "@/lib/municipios";

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
              <span className="municipio-nombre">{m.nombre}</span>
              <span className="municipio-detalle">
                {m.provincia} · {m.numObras} {m.numObras === 1 ? "obra" : "obras"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
