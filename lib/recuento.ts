/**
 * Recuento colectivo y anónimo: tipos y reglas comunes al cliente y al
 * servidor. Solo viajan contadores por obra; nunca quién votó.
 */
import type { Voto } from "./obras";
import { SENALES, type Senal } from "./senal";

export const VOTOS: readonly Voto[] = ["valio", "no_valio", "explica", "no_puedo"];

/** Por debajo de este total no se enseña el reparto: pocos votos dicen poco. */
export const MINIMO_PARA_MOSTRAR = 5;

export type Tipo = "voto" | "senal";

export interface Cambio {
  obra: string;
  tipo: Tipo;
  /** Lo que cuenta ahora este dispositivo para esa obra; null si lo quitó. */
  valor: string | null;
  /**
   * Recibo anónimo de esta aportación (128 bits al azar, uno por obra y
   * tipo). El servidor guarda qué cuenta cada recibo: repetir un envío no
   * suma dos veces y, sin el recibo, nadie puede quitar ni cambiar el voto.
   */
  recibo: string;
}

export const RECIBO = /^[0-9a-f]{32}$/;

export interface RecuentoObra {
  votos: Record<Voto, number>;
  senales: Record<Senal, number>;
}

export const valoresDe = (tipo: Tipo): readonly string[] => (tipo === "voto" ? VOTOS : SENALES);

export function recuentoVacio(): RecuentoObra {
  return {
    votos: { valio: 0, no_valio: 0, explica: 0, no_puedo: 0 },
    senales: { terminada: 0, en_obras: 0, no_hecha: 0, no_lo_se: 0 },
  };
}

export const total = (cuentas: Record<string, number>) => Object.values(cuentas).reduce((a, b) => a + b, 0);
