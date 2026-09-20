"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Voto, Votos } from "./obras";

const KEY = "valio.votos.v1";
const TUTORIAL_KEY = "valio.tutorial.visto.v1";
const VOTOS_VALIDOS: readonly string[] = ["valio", "no_valio", "explica", "no_puedo"];

/** Valida y sanea lo leído de localStorage: nunca confiamos en el almacenamiento. */
function sanitizarVotos(raw: unknown): Votos {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Votos = {};
  for (const [id, voto] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof voto === "string" && VOTOS_VALIDOS.includes(voto)) out[id] = voto as Voto;
  }
  return out;
}

function leerVotos(): Votos {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizarVotos(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

interface StoreValue {
  votos: Votos;
  votar: (id: string, voto: Voto) => void;
  reset: () => void;
  tutorialVisto: boolean;
  marcarTutorialVisto: () => void;
  listo: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [votos, setVotos] = useState<Votos>({});
  const [tutorialVisto, setTutorialVisto] = useState(true);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setVotos(leerVotos());
    try {
      setTutorialVisto(window.localStorage.getItem(TUTORIAL_KEY) === "1");
    } catch {
      // sin almacenamiento: tutorial cada visita, votos en memoria
    }
    setListo(true);
  }, []);

  const persist = useCallback((next: Votos) => {
    setVotos(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // sin persistencia, el voto vive solo en esta sesión
    }
  }, []);

  const votar = useCallback(
    (id: string, voto: Voto) => {
      persist({ ...votos, [id]: voto });
    },
    [persist, votos],
  );

  const reset = useCallback(() => persist({}), [persist]);

  const marcarTutorialVisto = useCallback(() => {
    setTutorialVisto(true);
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // sin persistencia
    }
  }, []);

  const value = useMemo(
    () => ({ votos, votar, reset, tutorialVisto, marcarTutorialVisto, listo }),
    [votos, votar, reset, tutorialVisto, marcarTutorialVisto, listo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
