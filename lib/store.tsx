"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Categoria, Obra, Voto, Votos } from "./obras";
import { SENALES, type Senal, type Senales } from "./senal";
import { cargarObras, esPilotoIne, municipioAntiguo, sanearMunicipio, type Municipio, type PoblacionMunicipio } from "./municipios";
import { OBRAS, POBLACION } from "./obras";
import type { Orden } from "./orden";
import { useSincronizar } from "./useSincronizar";

const KEY = "valio.votos.v1";
const TUTORIAL_KEY = "valio.tutorial.visto.v1";
const MUNICIPIO_KEY = "valio.municipio.v2";
/** Antes se guardaba solo el nombre; se migra al leer. */
const MUNICIPIO_KEY_V1 = "valio.municipio.v1";
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

/** Si se puede leer localStorage: entonces es la copia que comparten las pestañas. */
function almacenLegible(): boolean {
  try {
    window.localStorage.getItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Leer, cambiar y guardar una clave sin que otra pestaña se cuele en medio
 * (Web Storage no lo garantiza). Sin Web Locks (http sin cifrar), tal cual.
 */
function enOrden(clave: string, fn: () => void) {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) void locks.request(`valio.guardar.${clave}`, async () => fn());
  else fn();
}

/** Mismo contenido: no se cambia el estado (ni se vuelve a pintar). */
function iguales(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/** Cambios que no se pudieron guardar: id → valor (null = quitado). */
type Pendiente = Record<string, string | null>;

function superponer<T extends Record<string, string>>(disco: T, pendiente: Pendiente): T {
  const r: Record<string, string> = { ...disco };
  for (const [id, v] of Object.entries(pendiente)) {
    if (v === null) delete r[id];
    else r[id] = v;
  }
  return r as T;
}

/**
 * Aplica `cambio` sobre lo guardado (más lo pendiente) y lo guarda. Si no se
 * puede guardar, recuerda la diferencia con el disco para no perderla.
 */
function guardarSobreDisco<T extends Record<string, string>>(
  clave: string,
  disco: T,
  pendiente: { current: Pendiente },
  cambio: (actual: T) => T,
): T {
  const next = cambio(superponer(disco, pendiente.current));
  try {
    window.localStorage.setItem(clave, JSON.stringify(next));
    pendiente.current = {};
  } catch {
    const diferencia: Pendiente = {};
    for (const id of new Set([...Object.keys(disco), ...Object.keys(next)])) {
      if (next[id] !== disco[id]) diferencia[id] = next[id] ?? null;
    }
    pendiente.current = diferencia;
  }
  return next;
}

/** El municipio guardado (por su código INE); si no vale, se vuelve a preguntar. */
function leerMunicipio(): Municipio | null {
  try {
    const raw = window.localStorage.getItem(MUNICIPIO_KEY);
    if (raw) return sanearMunicipio(JSON.parse(raw));
    const antiguo = window.localStorage.getItem(MUNICIPIO_KEY_V1);
    return antiguo ? municipioAntiguo(antiguo) : null;
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
  /** Nombre del municipio elegido (para los textos). */
  municipio: string | null;
  /** El municipio elegido entero (código INE, provincia, comunidad). */
  ficha: Municipio | null;
  elegirMunicipio: (m: Municipio) => void;
  cambiarMunicipio: () => void;
  /** Obras del municipio elegido: lo único que ven el mazo y los paneles. */
  obras: Obra[];
  /** true mientras se descargan las obras de un municipio de la carga nacional. */
  cargando: boolean;
  /** Error de descarga, en una frase para el vecino (null si todo bien). */
  errorCarga: string | null;
  /** Denominador del coste por vecino del municipio elegido. */
  poblacion: PoblacionMunicipio | null;
  /** true si el municipio es del piloto verificado a mano. */
  esPiloto: boolean;
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
  const [ficha, setFicha] = useState<Municipio | null>(null);
  const municipio = ficha?.nombre ?? null;
  const [tipos, setTipos] = useState<Categoria[]>([]);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [versionRecuento, setVersionRecuento] = useState(0);

  useEffect(() => {
    setVotos(leerVotos());
    setSenales(leerSenales());
    setFicha(leerMunicipio());
    try {
      setTutorialVisto(window.localStorage.getItem(TUTORIAL_KEY) === "1");
    } catch {
      // sin almacenamiento: tutorial cada visita, votos en memoria
    }
    setListo(true);
  }, []);

  // Cada cambio se aplica sobre lo guardado, no sobre el estado de esta
  // pestaña: así una pestaña no borra lo que votó otra. Lo que no se pudo
  // guardar (almacenamiento lleno) se queda aparte y se aplica siempre encima.
  const votosRef = useRef(votos);
  votosRef.current = votos;
  const votosSinGuardar = useRef<Pendiente>({});
  const modificarVotos = useCallback((cambio: (actual: Votos) => Votos) => {
    setVotos(cambio); // en pantalla ya; el guardado, en orden entre pestañas
    enOrden(KEY, () => {
      const next = guardarSobreDisco(KEY, almacenLegible() ? leerVotos() : votosRef.current, votosSinGuardar, cambio);
      setVotos((prev) => (iguales(prev, next) ? prev : next));
    });
  }, []);

  const votar = useCallback(
    (id: string, voto: Voto) => modificarVotos((actual) => ({ ...actual, [id]: voto })),
    [modificarVotos],
  );

  const quitarVoto = useCallback(
    (id: string) =>
      modificarVotos((actual) => {
        const { [id]: _quitado, ...resto } = actual;
        return resto;
      }),
    [modificarVotos],
  );

  const senalesRef = useRef(senales);
  senalesRef.current = senales;
  const senalesSinGuardar = useRef<Pendiente>({});
  const responderSenal = useCallback((id: string, senal: Senal) => {
    const cambio = (actual: Senales) => ({ ...actual, [id]: senal });
    setSenales(cambio);
    enOrden(SENALES_KEY, () => {
      const next = guardarSobreDisco(SENALES_KEY, almacenLegible() ? leerSenales() : senalesRef.current, senalesSinGuardar, cambio);
      setSenales((prev) => (iguales(prev, next) ? prev : next));
    });
  }, []);

  // Lo que vota otra pestaña aparece también en esta.
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setVotos(superponer(leerVotos(), votosSinGuardar.current));
      if (e.key === SENALES_KEY || e.key === null) setSenales(superponer(leerSenales(), senalesSinGuardar.current));
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  const marcarTutorialVisto = useCallback(() => {
    setTutorialVisto(true);
    try {
      window.localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // sin persistencia
    }
  }, []);

  const elegirMunicipio = useCallback((m: Municipio) => {
    const valido = sanearMunicipio(m);
    if (!valido) return;
    setFicha(valido);
    try {
      window.localStorage.setItem(MUNICIPIO_KEY, JSON.stringify(valido));
      window.localStorage.removeItem(MUNICIPIO_KEY_V1);
    } catch {
      // sin persistencia: se vuelve a preguntar en la próxima visita
    }
  }, []);

  // Los votos se quedan: si vuelves a tu municipio, siguen ahí.
  const cambiarMunicipio = useCallback(() => {
    setFicha(null);
    setTipos([]); // los tipos de otro municipio pueden no existir
    try {
      window.localStorage.removeItem(MUNICIPIO_KEY);
      window.localStorage.removeItem(MUNICIPIO_KEY_V1);
    } catch {
      // sin persistencia
    }
  }, []);

  // Piloto: obras en el código. El resto: se descarga su provincia al elegir.
  const [obras, setObras] = useState<Obra[]>([]);
  const [poblacion, setPoblacion] = useState<PoblacionMunicipio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  useEffect(() => {
    setErrorCarga(null);
    if (!ficha) {
      setObras([]);
      setPoblacion(null);
      setCargando(false);
      return;
    }
    if (esPilotoIne(ficha.ine)) {
      setObras(OBRAS.filter((o) => o.municipio === "Teulada"));
      setPoblacion(POBLACION);
      setCargando(false);
      return;
    }
    let vigente = true;
    setObras([]);
    setPoblacion(null);
    setCargando(true);
    cargarObras(ficha)
      .then((r) => {
        if (!vigente) return;
        setObras(r.obras);
        setPoblacion(r.poblacion);
      })
      .catch(() => vigente && setErrorCarga(`No se han podido descargar las obras de ${ficha.nombre}. Revisa la conexión y vuelve a intentarlo.`))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [ficha]);
  const esPiloto = ficha ? esPilotoIne(ficha.ine) : false;

  useSincronizar(votos, senales, listo, () => setVersionRecuento((n) => n + 1));

  // «Volver a empezar» borra solo los votos del municipio actual: los de
  // otros municipios se conservan, igual que al cambiar de municipio.
  const reset = useCallback(() => {
    const deAqui = new Set(obras.map((o) => o.id));
    modificarVotos((actual) => Object.fromEntries(Object.entries(actual).filter(([id]) => !deAqui.has(id))));
  }, [modificarVotos, obras]);

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
      ficha,
      elegirMunicipio,
      cambiarMunicipio,
      obras,
      cargando,
      errorCarga,
      poblacion,
      esPiloto,
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
      ficha,
      elegirMunicipio,
      cambiarMunicipio,
      obras,
      cargando,
      errorCarga,
      poblacion,
      esPiloto,
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
