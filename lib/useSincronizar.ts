"use client";

import { useEffect, useRef, useState } from "react";
import type { Votos } from "./obras";
import type { Senales } from "./senal";
import type { Cambio, Tipo } from "./recuento";

/**
 * Lleva al recuento colectivo lo que este dispositivo ha votado. Cada obra y
 * tipo tiene un recibo al azar con una versión que solo sube; cada envío dice
 * «este recibo, en esta versión, cuenta X» y el servidor ignora versiones
 * viejas. Así reenviar no suma dos veces y una petición atrasada no resucita
 * un voto retirado. Nada identifica al dispositivo: los recibos de obras
 * distintas no tienen relación entre sí.
 *
 * Varias pestañas comparten los recibos en localStorage: se envía con un
 * bloqueo del navegador y releyéndolos dentro, para que ninguna cree un
 * segundo recibo (el almacén ya mantiene los votos iguales en todas). Un
 * voto cuyo recibo no se puede guardar no se envía: tras recargar se
 * contaría dos veces.
 */
const ENVIADO_KEY = "valio.recuento.enviado.v3";
const BLOQUEO = "valio.recuento";
const LOTE = 200;
/** Un envío que no responde se corta: no deja esperando a las demás pestañas. */
const PLAZO_MS = 15_000;
const REINTENTO_MS = 30_000;

/** confirmado: lo que el servidor ya cuenta. dudoso: hubo un envío sin respuesta. */
interface Fila {
  recibo: string;
  rev: number;
  confirmado: string | null;
  dudoso?: true;
}
type Enviado = Record<string, Partial<Record<Tipo, Fila>>>;

function leerEnviado(): Enviado | null {
  try {
    const raw = window.localStorage.getItem(ENVIADO_KEY);
    const datos = raw ? JSON.parse(raw) : {};
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  } catch {
    return null;
  }
}

function guardarEnviado(e: Enviado): boolean {
  try {
    window.localStorage.setItem(ENVIADO_KEY, JSON.stringify(e));
    return true;
  } catch {
    return false;
  }
}

function nuevoRecibo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lo que falta por contar; deja en `enviado` el recibo y la versión de cada envío. */
function pendientes(votos: Votos, senales: Senales, enviado: Enviado): Cambio[] {
  const ids = new Set([...Object.keys(votos), ...Object.keys(senales), ...Object.keys(enviado)]);
  const cambios: Cambio[] = [];
  for (const obra of ids) {
    const deseado: Record<Tipo, string | null> = { voto: votos[obra] ?? null, senal: senales[obra] ?? null };
    for (const tipo of ["voto", "senal"] as const) {
      if (cambios.length >= LOTE) return cambios;
      const fila = enviado[obra]?.[tipo];
      if (!fila && deseado[tipo] === null) continue;
      if (fila && fila.confirmado === deseado[tipo] && !fila.dudoso) continue;
      const recibo = fila?.recibo ?? nuevoRecibo();
      const rev = (fila?.rev ?? 0) + 1;
      enviado[obra] = { ...enviado[obra], [tipo]: { recibo, rev, confirmado: fila?.confirmado ?? null, dudoso: true } };
      cambios.push({ obra, tipo, valor: deseado[tipo], recibo, rev });
    }
  }
  return cambios;
}

function confirmar(enviado: Enviado, cambios: Cambio[]) {
  for (const c of cambios) {
    const filas = { ...enviado[c.obra] };
    // Quitado: el próximo voto a esta obra lleva un recibo nuevo.
    if (c.valor === null) delete filas[c.tipo];
    else filas[c.tipo] = { recibo: c.recibo, rev: c.rev, confirmado: c.valor };
    if (filas.voto || filas.senal) enviado[c.obra] = filas;
    else delete enviado[c.obra];
  }
}

/**
 * Con bloqueo entre pestañas. Sin Web Locks (solo fuera de https) no se
 * envía nada: dos pestañas podrían pisarse los recibos y contar dos veces.
 * Los votos siguen en el dispositivo.
 */
async function conBloqueo(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) await locks.request(BLOQUEO, fn);
}

export function useSincronizar(votos: Votos, senales: Senales, listo: boolean, alEnviar: () => void) {
  const enVuelo = useRef(false);
  // Solo si el dispositivo no deja leer nada: entonces tampoco recuerda los
  // votos al recargar, y la copia en memoria basta para esta visita.
  const enMemoria = useRef<Enviado>({});
  // Lo último que muestra la pestaña, leído ya dentro del bloqueo.
  const deseado = useRef({ votos, senales });
  deseado.current = { votos, senales };
  // Vuelve a mirar si quedó algo por enviar (lote partido, cambio durante un envío o fallo de red).
  const [pulso, setPulso] = useState(0);
  const alEnviarRef = useRef(alEnviar);
  alEnviarRef.current = alEnviar;

  useEffect(() => {
    if (!listo) return;
    let reintento: number | undefined;
    // Un respiro: deshacer justo después de votar no llega a viajar.
    const t = window.setTimeout(() => {
      if (enVuelo.current) {
        setPulso((n) => n + 1);
        return;
      }
      enVuelo.current = true;
      conBloqueo(async () => {
        const enviadoGuardado = leerEnviado();
        const persistente = enviadoGuardado !== null;
        const enviado = enviadoGuardado ?? enMemoria.current;
        const cambios = pendientes(deseado.current.votos, deseado.current.senales, enviado);
        if (cambios.length === 0) return;
        // El recibo y su versión se guardan antes de enviar; si no se puede, no se envía.
        if (persistente && !guardarEnviado(enviado)) return;
        const res = await fetch("/api/recuento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cambios }),
          keepalive: true,
          signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(PLAZO_MS) : undefined,
        });
        // 400: nada del lote es válido (obras retiradas). Se da por tratado
        // para no reintentarlo sin fin.
        if (res.ok || res.status === 400) {
          confirmar(enviado, cambios);
          if (persistente) guardarEnviado(enviado);
          if (res.ok) alEnviarRef.current();
          if (cambios.length >= LOTE) setPulso((n) => n + 1);
        } else if (res.status !== 429) throw new Error(`recuento ${res.status}`);
        // 429: límite del día; se reintenta con el siguiente cambio o la próxima visita.
      })
        .catch(() => {
          // sin red, sin respuesta o límite: los recibos quedan «dudosos» y se reenvían igual
          reintento = window.setTimeout(() => setPulso((n) => n + 1), REINTENTO_MS);
        })
        .finally(() => {
          enVuelo.current = false;
        });
    }, 1500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(reintento);
    };
  }, [votos, senales, listo, pulso]);
}
