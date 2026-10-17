"use client";

import { useEffect, useRef, useState } from "react";
import type { Votos } from "./obras";
import type { Senales } from "./senal";
import type { Cambio, Tipo } from "./recuento";

/**
 * Lleva al recuento colectivo lo que este dispositivo ha votado. Cada obra y
 * tipo tiene un recibo al azar; cada envío dice «este recibo cuenta X» y el
 * servidor lo aplica una sola vez. Si se pierde la respuesta, se reenvía lo
 * mismo con el mismo recibo y no suma dos veces. Nada identifica al
 * dispositivo: los recibos de obras distintas no tienen relación entre sí.
 */
const ENVIADO_KEY = "valio.recuento.enviado.v2";
const LOTE = 200;

/** confirmado: lo que el servidor ya cuenta. dudoso: hubo un envío sin respuesta. */
interface Fila {
  recibo: string;
  confirmado: string | null;
  dudoso?: true;
}
type Enviado = Record<string, Partial<Record<Tipo, Fila>>>;

function leerEnviado(): Enviado {
  try {
    const raw = window.localStorage.getItem(ENVIADO_KEY);
    const datos = raw ? JSON.parse(raw) : {};
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : {};
  } catch {
    return {};
  }
}

function guardarEnviado(e: Enviado) {
  try {
    window.localStorage.setItem(ENVIADO_KEY, JSON.stringify(e));
  } catch {
    // sin persistencia: la copia en memoria sirve mientras dure la visita
  }
}

function nuevoRecibo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lo que falta por contar; crea los recibos que hagan falta en `enviado`. */
function pendientes(votos: Votos, senales: Senales, enviado: Enviado): Cambio[] {
  const ids = new Set([...Object.keys(votos), ...Object.keys(senales), ...Object.keys(enviado)]);
  const cambios: Cambio[] = [];
  for (const obra of ids) {
    const deseado: Record<Tipo, string | null> = { voto: votos[obra] ?? null, senal: senales[obra] ?? null };
    for (const tipo of ["voto", "senal"] as const) {
      const fila = enviado[obra]?.[tipo];
      if (!fila && deseado[tipo] === null) continue;
      if (fila && fila.confirmado === deseado[tipo] && !fila.dudoso) continue;
      const recibo = fila?.recibo ?? nuevoRecibo();
      enviado[obra] = { ...enviado[obra], [tipo]: { recibo, confirmado: fila?.confirmado ?? null, dudoso: true } };
      cambios.push({ obra, tipo, valor: deseado[tipo], recibo });
    }
  }
  return cambios;
}

function confirmar(enviado: Enviado, cambios: Cambio[]) {
  for (const c of cambios) {
    const filas = { ...enviado[c.obra] };
    // Quitado: el servidor ya borró el recibo; el próximo voto lleva uno nuevo.
    if (c.valor === null) delete filas[c.tipo];
    else filas[c.tipo] = { recibo: c.recibo, confirmado: c.valor };
    if (filas.voto || filas.senal) enviado[c.obra] = filas;
    else delete enviado[c.obra];
  }
}

export function useSincronizar(votos: Votos, senales: Senales, listo: boolean, alEnviar: () => void) {
  const enVuelo = useRef(false);
  // Copia en memoria: manda sobre localStorage, que puede fallar o estar lleno.
  const enviadoRef = useRef<Enviado | null>(null);
  // Vuelve a mirar si quedó algo por enviar (lote partido o cambio durante un envío).
  const [pulso, setPulso] = useState(0);
  const alEnviarRef = useRef(alEnviar);
  alEnviarRef.current = alEnviar;

  useEffect(() => {
    if (!listo) return;
    // Un respiro: deshacer justo después de votar no llega a viajar.
    const t = window.setTimeout(async () => {
      if (enVuelo.current) {
        setPulso((n) => n + 1);
        return;
      }
      const enviado = (enviadoRef.current ??= leerEnviado());
      const cambios = pendientes(votos, senales, enviado).slice(0, LOTE);
      if (cambios.length === 0) return;
      // El recibo se guarda antes de enviar: si la respuesta se pierde, se reenvía el mismo.
      guardarEnviado(enviado);
      enVuelo.current = true;
      try {
        const res = await fetch("/api/recuento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cambios }),
          keepalive: true,
        });
        // 400: nada del lote es válido (obras retiradas). Se da por tratado
        // para no reintentarlo sin fin.
        if (res.ok || res.status === 400) {
          confirmar(enviado, cambios);
          guardarEnviado(enviado);
          if (res.ok) alEnviarRef.current();
          setPulso((n) => n + 1);
        }
      } catch {
        // sin red: se reintenta con el siguiente cambio o la próxima visita
      } finally {
        enVuelo.current = false;
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [votos, senales, listo, pulso]);
}
