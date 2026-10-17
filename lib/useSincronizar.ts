"use client";

import { useEffect, useRef, useState } from "react";
import type { Votos } from "./obras";
import type { Senales } from "./senal";
import type { Cambio } from "./recuento";

/**
 * Lleva al recuento colectivo lo que este dispositivo ha votado. Guarda qué
 * tiene contado ya el servidor y solo envía la diferencia: si falla la red,
 * la diferencia sigue ahí y se envía en el siguiente cambio o la próxima
 * visita. Nada identifica al dispositivo: solo viajan obra, tipo y valor.
 */
const ENVIADO_KEY = "valio.recuento.enviado.v1";

type Enviado = Record<string, { voto?: string; senal?: string }>;

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
    // sin persistencia: se reenviaría la diferencia, y el servidor no baja de cero
  }
}

function diferencias(votos: Votos, senales: Senales, enviado: Enviado): Cambio[] {
  const ids = new Set([...Object.keys(votos), ...Object.keys(senales), ...Object.keys(enviado)]);
  const cambios: Cambio[] = [];
  for (const obra of ids) {
    const antes = enviado[obra] ?? {};
    const voto = votos[obra] ?? null;
    if (voto !== (antes.voto ?? null)) cambios.push({ obra, tipo: "voto", valor: voto, anterior: antes.voto ?? null });
    const senal = senales[obra] ?? null;
    if (senal !== (antes.senal ?? null))
      cambios.push({ obra, tipo: "senal", valor: senal, anterior: antes.senal ?? null });
  }
  return cambios;
}

function aplicarAlEnviado(enviado: Enviado, cambios: Cambio[]): Enviado {
  const next: Enviado = { ...enviado };
  for (const c of cambios) {
    const fila = { ...(next[c.obra] ?? {}) };
    if (c.valor === null) delete fila[c.tipo];
    else fila[c.tipo] = c.valor;
    if (fila.voto || fila.senal) next[c.obra] = fila;
    else delete next[c.obra];
  }
  return next;
}

export function useSincronizar(votos: Votos, senales: Senales, listo: boolean, alEnviar: () => void) {
  const enVuelo = useRef(false);
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
      const enviado = leerEnviado();
      const cambios = diferencias(votos, senales, enviado);
      if (cambios.length === 0) return;
      enVuelo.current = true;
      try {
        const res = await fetch("/api/recuento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cambios: cambios.slice(0, 200) }),
          keepalive: true,
        });
        // 400: datos que el servidor no reconoce (una obra retirada). Se dan
        // por tratados para no reintentarlos sin fin.
        if (res.ok || res.status === 400) {
          const nuevo = aplicarAlEnviado(enviado, cambios.slice(0, 200));
          guardarEnviado(nuevo);
          if (res.ok) alEnviarRef.current();
          if (cambios.length > 200) setPulso((n) => n + 1);
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
