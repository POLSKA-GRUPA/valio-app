/**
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 * Regenerar con: node scripts/hornear-vista-aerea.mjs
 * Fotos aéreas oficiales de cada obra, con la fecha de vuelo que da el propio
 * servicio en el punto. Generado: (pendiente)
 */

export type Veredicto = "posterior" | "durante" | "anterior" | "no_visible" | "sin_fechas";

export interface FotoAerea {
  src: string;
  /** AAAA-MM del vuelo en el punto (IGN) o AAAA (ICV, ver ventana). */
  fecha: string;
  /** Ventana del vuelo de toda la Comunitat (ICV): [inicio, fin] AAAA-MM-DD. */
  ventana: [string, string] | null;
  fuente: string;
  capa: string;
  resolucionM: number | null;
  atribucion: string;
  /** Petición WMS original, para poder reproducir la imagen. */
  origen: string;
}

export interface VistaAerea {
  /** [latMin, lonMin, latMax, lonMax] del encuadre. */
  caja: [number, number, number, number];
  metrosAncho: number;
  ahora: FotoAerea;
  antes: FotoAerea | null;
  adjudicacion: string | null;
  finPrevisto: string | null;
  veredicto: Veredicto;
}

export const VISTAS_AEREAS: Record<string, VistaAerea> = {};
