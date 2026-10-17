"use client";

import { Info as IconoInfo, Layers, List, type LucideIcon } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Deck } from "@/components/Deck";
import { ElegirMunicipio } from "@/components/ElegirMunicipio";
import { Info } from "@/components/Panels";
import { ListaObras } from "@/components/ListaObras";
import { tienePlataformaPropia } from "@/lib/municipios";

type Pestaña = "votar" | "obras" | "info";

// Iconos Lucide en lugar de emojis (ISSUE-39).
const PESTAÑAS: { id: Pestaña; Icono: LucideIcon; etiqueta: string }[] = [
  { id: "votar", Icono: Layers, etiqueta: "Votar" },
  { id: "obras", Icono: List, etiqueta: "Obras" },
  { id: "info", Icono: IconoInfo, etiqueta: "Info" },
];

/** Framer respeta «Reducir movimiento» del sistema. */
export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <Contenido />
    </MotionConfig>
  );
}

function Contenido() {
  const { votos, listo, municipio, ficha, elegirMunicipio, obras, cargando, errorCarga, esPiloto, cambiarMunicipio } =
    useStore();
  const sinObras = !cargando && !errorCarga && obras.length === 0;
  const [pestaña, setPestaña] = useState<Pestaña>("votar");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const votadas = obras.filter((o) => votos[o.id]).length;

  const onTablistKey = (e: React.KeyboardEvent) => {
    const actual = PESTAÑAS.findIndex((p) => p.id === pestaña);
    let siguiente: number;
    if (e.key === "ArrowRight") siguiente = (actual + 1) % PESTAÑAS.length;
    else if (e.key === "ArrowLeft") siguiente = (actual - 1 + PESTAÑAS.length) % PESTAÑAS.length;
    else if (e.key === "Home") siguiente = 0;
    else if (e.key === "End") siguiente = PESTAÑAS.length - 1;
    else return;
    e.preventDefault();
    setPestaña(PESTAÑAS[siguiente].id);
    tabRefs.current[siguiente]?.focus();
  };

  // Hasta leer el dispositivo no sabemos si ya eligió municipio: sin parpadeo de pantallas.
  if (!listo) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <h1 className="brand display">¿VALIÓ?</h1>
        </header>
        <div className="panel" aria-busy="true" />
      </main>
    );
  }

  if (!municipio) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <h1 className="brand display">¿VALIÓ?</h1>
        </header>
        <ElegirMunicipio
          onElegir={(m) => {
            elegirMunicipio(m);
            setPestaña("votar");
          }}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1 className="brand display">¿VALIÓ?</h1>
        <span className="brand-badge">
          {esPiloto ? "PILOTO" : "DATO OFICIAL"} · {municipio} · {votadas}/{obras.length}
        </span>
      </header>

      {sinObras && ficha && (
        <section className="panel" aria-live="polite">
          <h2 className="panel-title">Aún no tenemos obras de {municipio}</h2>
          <p className="panel-intro">
            En la Plataforma de Contratación del Sector Público no hemos encontrado obras adjudicadas de{" "}
            {municipio} con actividad desde enero de 2024.
            {tienePlataformaPropia(ficha.ccaa)
              ? ` Muchos ayuntamientos de ${ficha.ccaa} publican sus contratos en la plataforma de su comunidad, que todavía no hemos cargado: no quiere decir que no haya obras.`
              : " Puede que haya obras de importe pequeño o publicadas en otro sitio: no quiere decir que no haya obras."}
          </p>
          <button type="button" className="btn" onClick={cambiarMunicipio}>
            Elegir otro municipio
          </button>
        </section>
      )}

      {(cargando || errorCarga) && (
        <section className="panel" aria-busy={cargando} aria-live="polite">
          <p className="panel-intro">{errorCarga ?? `Descargando las obras de ${municipio}…`}</p>
          {errorCarga && (
            <button type="button" className="btn" onClick={cambiarMunicipio}>
              Elegir otro municipio
            </button>
          )}
        </section>
      )}

      {PESTAÑAS.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`panel-${p.id}`}
          aria-labelledby={`tab-${p.id}`}
          hidden={pestaña !== p.id}
          className="tabpanel-wrap"
        >
          {!cargando && !errorCarga && !sinObras && pestaña === "votar" && p.id === "votar" && <Deck />}
          {!cargando && !errorCarga && !sinObras && pestaña === "obras" && p.id === "obras" && <ListaObras />}
          {pestaña === "info" && p.id === "info" && <Info />}
        </div>
      ))}

      <nav className="tabbar" role="tablist" aria-label="Navegación principal" onKeyDown={onTablistKey}>
        {PESTAÑAS.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`tab-${p.id}`}
            role="tab"
            aria-selected={pestaña === p.id}
            aria-controls={`panel-${p.id}`}
            tabIndex={pestaña === p.id ? 0 : -1}
            className="tab"
            onClick={() => setPestaña(p.id)}
          >
            <p.Icono className="tab-icon" size={22} aria-hidden="true" />
            {p.etiqueta}
          </button>
        ))}
      </nav>
    </main>
  );
}
