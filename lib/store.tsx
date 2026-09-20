"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Votos } from "./obras";

const KEY = "valio.votos.v1";
const TUTORIAL_KEY = "valio.tutorial.visto.v1";

interface StoreValue {
  votos: Votos;
  votar: (id: string, voto: Votos[string]) => void;
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
    try {
      const rawVotos = window.localStorage.getItem(KEY);
      if (rawVotos) setVotos(JSON.parse(rawVotos) as Votos);
      setTutorialVisto(window.localStorage.getItem(TUTORIAL_KEY) === "1");
    } catch {
      // almacenamiento no disponible: la app sigue funcionando sin persistencia
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
    (id: string, voto: Votos[string]) => {
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
