"use client";

import { useRef, useState } from "react";
import { OBRAS } from "@/lib/obras";
import { useStore } from "@/lib/store";
import { Deck } from "@/components/Deck";
import { CabreoMap, Info, Results } from "@/components/Panels";

type Pestaña = "votar" | "cabreo" | "resultados" | "info";

const PESTAÑAS: { id: Pestaña; icono: string; etiqueta: string }[] = [
  { id: "votar", icono: "🂠", etiqueta: "Votar" },
  { id: "cabreo", icono: "📍", etiqueta: "Cabreo" },
  { id: "resultados", icono: "🗳", etiqueta: "Resultados" },
  { id: "info", icono: "ℹ", etiqueta: "Info" },
];

export default function Home() {
  const { votos } = useStore();
  const [pestaña, setPestaña] = useState<Pestaña>("votar");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const votadas = OBRAS.filter((o) => votos[o.id]).length;

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1 className="brand display">¿VALIÓ?</h1>
        <span className="brand-badge">PILOTO · {OBRAS[0].municipio} · {votadas}/{OBRAS.length}</span>
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
            <span className="tab-icon" aria-hidden="true">
              {p.icono}
            </span>
            {p.etiqueta}
          </button>
        ))}
      </nav>
    </main>
  );
}
