"use client";

import { useState } from "react";
import { OBRAS, type Votos } from "@/lib/obras";
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
  const votadas = OBRAS.filter((o) => (votos as Votos)[o.id]).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <h1 className="brand display">¿VALIÓ?</h1>
        <span className="brand-badge">DEMO · {votadas}/{OBRAS.length}</span>
      </header>

      {pestaña === "votar" && <Deck activo={pestaña === "votar"} />}
      {pestaña === "cabreo" && <CabreoMap votos={votos} />}
      {pestaña === "resultados" && <Results />}
      {pestaña === "info" && <Info />}

      <nav className="tabbar" role="tablist" aria-label="Navegación principal">
        {PESTAÑAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestaña === p.id}
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
