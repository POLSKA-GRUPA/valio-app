"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { buscar, cargarIndice, type Municipio } from "@/lib/municipios";
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
export function ElegirMunicipio({ onElegir }: { onElegir: (m: Municipio) => void }) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [todos, setTodos] = useState<Municipio[] | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const idBuscar = useId();

  // El lector empieza por la pregunta, no por el primer botón.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  useEffect(() => {
    let vivo = true;
    setError(false);
    cargarIndice()
      .then((lista) => vivo && setTodos(lista))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [intento]);

  // Sin escribir: los que más obras tienen. Escribiendo: los que encajan.
  const destacados = todos ? [...todos].sort((a, b) => b.numObras - a.numObras).slice(0, 6) : [];
  const escrito = busqueda.trim().length > 0;
  const visibles = todos ? (escrito ? buscar(todos, busqueda) : destacados) : [];

  return (
    <section className="panel municipio-panel" aria-labelledby="municipio-titulo">
      <Abanico />
      <h2 id="municipio-titulo" className="panel-title display" tabIndex={-1} ref={tituloRef}>
        ¿Dónde vives?
      </h2>
      <p className="panel-intro">
        Busca tu municipio entre los de toda España para ver sus obras. Solo te preguntamos el municipio: nunca tu
        ubicación. Se guarda en este dispositivo.
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
      {error && (
        <p className="municipio-vacio" role="alert">
          No se ha podido descargar la lista de municipios.{" "}
          <button type="button" className="btn" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </p>
      )}
      {!todos && !error && (
        <p className="municipio-vacio" role="status" aria-busy="true">
          Cargando municipios…
        </p>
      )}
      {todos && escrito && visibles.length === 0 && (
        <p className="municipio-vacio" role="status">
          No encontramos ningún municipio llamado «{busqueda}».
        </p>
      )}
      {todos && !escrito && <p className="municipio-vacio">Algunos con datos:</p>}
      <ul className="municipio-lista">
        {visibles.map((m) => (
          <li key={m.ine}>
            <button type="button" className="btn municipio-btn" onClick={() => onElegir(m)}>
              <span className="municipio-punto" aria-hidden="true">
                <MapPin size={20} />
              </span>
              <span className="municipio-nombre">{m.nombre}</span>
              <span className="municipio-detalle">
                {m.provincia} ·{" "}
                {m.numObras === 0 ? "sin obras cargadas" : `${m.numObras.toLocaleString("es-ES")} ${m.numObras === 1 ? "obra" : "obras"}`}
              </span>
              <ChevronRight className="municipio-flecha" size={20} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
