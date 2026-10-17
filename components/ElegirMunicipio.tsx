"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { MUNICIPIOS, normalizar } from "@/lib/municipios";
import { OBRAS } from "@/lib/obras";
import { eurosCompactos } from "@/lib/formato";
import { importeDe } from "@/lib/orden";
import { IconoTipo, slugTipo } from "./TipoObra";

/**
 * Bienvenida con las tres obras de mayor importe en abanico
 * (como «Get Started» de Luma). Datos reales del piloto verificado
 * (lib/obras.ts), no de la carga nacional; decorativo para el lector, que
 * ya tiene la pregunta y la lista.
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
  const [busqueda, setBusqueda] = useState("");
  const idBuscar = useId();
  const visibles = MUNICIPIOS.filter((m) => normalizar(m.nombre).includes(normalizar(busqueda)));

  // El lector empieza por la pregunta, no por el primer botón.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <section className="panel municipio-panel" aria-labelledby="municipio-titulo">
      <Abanico />
      <h2 id="municipio-titulo" className="panel-title display" tabIndex={-1} ref={tituloRef}>
        ¿Dónde vives?
      </h2>
      <p className="panel-intro">
        Elige tu municipio para ver sus obras. Solo te preguntamos el municipio: nunca tu ubicación. Se guarda
        en este dispositivo.
      </p>
      <label htmlFor={idBuscar} className="sr-only">
        Busca tu municipio
      </label>
      <input
        id={idBuscar}
        type="search"
        className="municipio-buscar"
        placeholder="Busca tu municipio"
        autoComplete="off"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      {visibles.length === 0 && (
        <p className="municipio-vacio" role="status">
          Aún no tenemos obras de «{busqueda}». Estamos añadiendo municipios.
        </p>
      )}
      <ul className="municipio-lista">
        {visibles.map((m) => (
          <li key={m.nombre}>
            <button type="button" className="btn municipio-btn" onClick={() => onElegir(m.nombre)}>
              <span className="municipio-punto" aria-hidden="true">
                <MapPin size={20} />
              </span>
              <span className="municipio-nombre">{m.nombre}</span>
              <span className="municipio-detalle">
                {m.provincia} · {m.numObras} {m.numObras === 1 ? "obra" : "obras"}
              </span>
              <ChevronRight className="municipio-flecha" size={20} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
