"use client";

import { Info as IconoInfo, Layers, List, MapPin, Vote, type LucideIcon } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Deck } from "@/components/Deck";
import { ElegirMunicipio } from "@/components/ElegirMunicipio";
import { CabreoMap, Info, Results } from "@/components/Panels";
import { ListaObras } from "@/components/ListaObras";
import { REDISENO_LUMA } from "@/lib/flags";

type Pestaña = "votar" | "obras" | "cabreo" | "resultados" | "info";

// P1 (#38): Cabreo y Resultados están vacías o con relleno. Se ocultan sin
// borrar su código; para volver a mostrarlas basta con poner esto a true.
const MOSTRAR_CABREO_Y_RESULTADOS = false;

// Iconos Lucide en lugar de emojis (ISSUE-39).
const TODAS_LAS_PESTAÑAS: { id: Pestaña; Icono: LucideIcon; etiqueta: string }[] = [
  { id: "votar", Icono: Layers, etiqueta: "Votar" },
  { id: "obras", Icono: List, etiqueta: "Obras" },
  { id: "cabreo", Icono: MapPin, etiqueta: "Cabreo" },
  { id: "resultados", Icono: Vote, etiqueta: "Resultados" },
  { id: "info", Icono: IconoInfo, etiqueta: "Info" },
];

// «Obras» (lista por año) solo existe en el rediseño Luma.
const PESTAÑAS = (
  MOSTRAR_CABREO_Y_RESULTADOS
    ? TODAS_LAS_PESTAÑAS
    : TODAS_LAS_PESTAÑAS.filter((p) => p.id !== "cabreo" && p.id !== "resultados")
).filter((p) => REDISENO_LUMA || p.id !== "obras");

/** Rediseño Luma: Framer respeta «Reducir movimiento» del sistema. */
function Movimiento({ children }: { children: React.ReactNode }) {
  return REDISENO_LUMA ? <MotionConfig reducedMotion="user">{children}</MotionConfig> : <>{children}</>;
}

export default function Home() {
  return (
    <Movimiento>
      <Contenido />
    </Movimiento>
  );
}

function Contenido() {
  const { votos, listo, municipio, elegirMunicipio, obras } = useStore();
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
          onElegir={(nombre) => {
            elegirMunicipio(nombre);
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
        <span className="brand-badge">PILOTO · {municipio} · {votadas}/{obras.length}</span>
      </header>

      {PESTAÑAS.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`panel-${p.id}`}
          aria-labelledby={`tab-${p.id}`}
          hidden={pestaña !== p.id}
          className="tabpanel-wrap"
        >
          {pestaña === "votar" && p.id === "votar" && <Deck />}
          {pestaña === "obras" && p.id === "obras" && <ListaObras />}
          {pestaña === "cabreo" && p.id === "cabreo" && <CabreoMap votos={votos} />}
          {pestaña === "resultados" && p.id === "resultados" && <Results />}
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
