import type { Obra } from "./obras";

export type Orden = "recientes" | "importe";

export const ORDEN_LABEL: Record<Orden, string> = {
  recientes: "Más recientes",
  importe: "Mayor importe",
};

/**
 * Importe que enseña la tarjeta: el adjudicado y, si no lo hay, el de
 * licitación (los dos sin IVA). Pendiente de confirmar con Kenyi (informe semana 3).
 */
export function importeDe(obra: Obra): number {
  return obra.adjudicacion?.importeSinIva ?? obra.importeLicitacion;
}

/**
 * «Más recientes» va por año (decisión provisional, pendiente de Kenyi).
 * Con el mismo año se respeta el orden de los datos: sort es estable.
 */
export function ordenar(obras: Obra[], orden: Orden): Obra[] {
  const copia = [...obras];
  if (orden === "importe") return copia.sort((a, b) => importeDe(b) - importeDe(a));
  return copia.sort((a, b) => b.anyo - a.anyo);
}
