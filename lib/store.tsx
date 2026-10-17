"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Categoria, Obra, Voto, Votos } from "./obras";
import { SENALES, type Senal, type Senales } from "./senal";
import { existeMunicipio, obrasDe } from "./municipios";
import type { Orden } from "./orden";
import { useSincronizar } from "./useSincronizar";

const KEY = "valio.votos.v1";
const TUTORIAL_KEY = "valio.tutorial.visto.v1";
const MUNICIPIO_KEY = "valio.municipio.v1";
const SENALES_KEY = "valio.senales.v1";
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

/** Igual que los votos: solo pasan respuestas conocidas (ISSUE-43). */
function sanitizarSenales(raw: unknown): Senales {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Senales = {};
  for (const [id, senal] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof senal === "string" && (SENALES as readonly string[]).includes(senal)) out[id] = senal as Senal;
  }
  return out;
}

function leerSenales(): Senales {
  try {
    const raw = window.localStorage.getItem(SENALES_KEY);
    return raw ? sanitizarSenales(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function leerVotos(): Votos {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizarVotos(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Solo vale un municipio que exista en los datos; si no, se vuelve a preguntar. */
function leerMunicipio(): string | null {
  try {
    const raw = window.localStorage.getItem(MUNICIPIO_KEY);
    return raw && existeMunicipio(raw) ? raw : null;
  } catch {
    return null;
  }
}

interface StoreValue {
  votos: Votos;
  votar: (id: string, voto: Voto) => void;
  /** Deshace un voto (aviso con «Deshacer» del rediseño). */
  quitarVoto: (id: string) => void;
  reset: () => void;
  tutorialVisto: boolean;
  marcarTutorialVisto: () => void;
  /** Señal vecinal por obra: se puede cambiar, no borrar (ISSUE-43). */
  senales: Senales;
  responderSenal: (id: string, senal: Senal) => void;
  listo: boolean;
  municipio: string | null;
  elegirMunicipio: (nombre: string) => void;
  cambiarMunicipio: () => void;
  /** Obras del municipio elegido: lo único que ven el mazo y los paneles. */
  obras: Obra[];
  /** Tipos marcados en los chips del mazo. Vacío = todas. Solo en memoria. */
  tipos: Categoria[];
  alternarTipo: (tipo: Categoria) => void;
  verTodosLosTipos: () => void;
  /** Orden del mazo. Solo en memoria. */
  orden: Orden;
  setOrden: (orden: Orden) => void;
  /** Sube cada vez que el recuento colectivo recibe un cambio de aquí. */
  versionRecuento: number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [votos, setVotos] = useState<Votos>({});
  const [senales, setSenales] = useState<Senales>({});
  const [tutorialVisto, setTutorialVisto] = useState(true);
  const [listo, setListo] = useState(false);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [tipos, setTipos] = useState<Categoria[]>([]);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [versionRecuento, setVersionRecuento] = useState(0);

  useEffect(() => {
    setVotos(leerVotos());
    setSenales(leerSenales());
    setMunicipio(leerMunicipio());
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

  const quitarVoto = useCallback(
    (id: string) => {
      if (!(id in votos)) return;
      const { [id]: _quitado, ...resto } = votos;
      persist(resto);
    },
    [persist, votos],
  );

  const responderSenal = useCallback((id: string, senal: Senal) => {
    setSenales((prev) => {
      const next = { ...prev, [id]: senal };
      try {
        window.localStorage.setItem(SENALES_KEY, JSON.stringify(next));
      } catch {
        // sin persistencia, la respuesta vive solo en esta sesión
      }
      return next;
    });
  }, []);

  const marcarTutorialVisto = useCallback(() => {
    setTutorialVisto(true);
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // sin persistencia
    }
  }, []);

  const elegirMunicipio = useCallback((nombre: string) => {
    if (!existeMunicipio(nombre)) return;
    setMunicipio(nombre);
    try {
      window.localStorage.setItem(MUNICIPIO_KEY, nombre);
    } catch {
      // sin persistencia: se vuelve a preguntar en la próxima visita
    }
  }, []);

  // Los votos se quedan: si vuelves a tu municipio, siguen ahí.
  const cambiarMunicipio = useCallback(() => {
    setMunicipio(null);
    setTipos([]); // los tipos de otro municipio pueden no existir
    try {
      window.localStorage.removeItem(MUNICIPIO_KEY);
    } catch {
      // sin persistencia
    }
  }, []);

  const obras = useMemo(() => obrasDe(municipio), [municipio]);

  useSincronizar(votos, senales, listo, () => setVersionRecuento((n) => n + 1));

  // «Volver a empezar» borra solo los votos del municipio actual: los de
  // otros municipios se conservan, igual que al cambiar de municipio.
  const reset = useCallback(() => {
    const deAqui = new Set(obras.map((o) => o.id));
    persist(Object.fromEntries(Object.entries(votos).filter(([id]) => !deAqui.has(id))));
  }, [persist, votos, obras]);

  const alternarTipo = useCallback((tipo: Categoria) => {
    setTipos((actual) => (actual.includes(tipo) ? actual.filter((t) => t !== tipo) : [...actual, tipo]));
  }, []);

  const verTodosLosTipos = useCallback(() => setTipos([]), []);

  const value = useMemo(
    () => ({
      votos,
      votar,
      quitarVoto,
      reset,
      tutorialVisto,
      marcarTutorialVisto,
      listo,
      municipio,
      elegirMunicipio,
      cambiarMunicipio,
      obras,
      tipos,
      alternarTipo,
      verTodosLosTipos,
      orden,
      setOrden,
      senales,
      responderSenal,
      versionRecuento,
    }),
    [
      votos,
      votar,
      quitarVoto,
      reset,
      tutorialVisto,
      marcarTutorialVisto,
      listo,
      municipio,
      elegirMunicipio,
      cambiarMunicipio,
      obras,
      tipos,
      alternarTipo,
      verTodosLosTipos,
      orden,
      senales,
      responderSenal,
      versionRecuento,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
