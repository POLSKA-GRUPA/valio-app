import { OBRAS, POBLACION, type Obra } from "./obras";
import { MUNICIPIOS_NACIONALES, type PoblacionMunicipio } from "./municipios-nacionales";

export type { PoblacionMunicipio };

export interface Municipio {
  nombre: string;
  provincia: string;
  numObras: number;
  /** Código INE si viene de la carga nacional; null en el piloto verificado. */
  ine: string | null;
  poblacion: PoblacionMunicipio;
}

/**
 * Municipios del piloto verificado a mano (lib/obras.ts): sus obras van en
 * el propio código y salen de los datos, no de una lista a mano.
 */
const PILOTO: Municipio[] = Array.from(
  OBRAS.reduce((mapa, obra) => {
    const actual = mapa.get(obra.municipio);
    if (actual) actual.numObras += 1;
    else
      mapa.set(obra.municipio, {
        nombre: obra.municipio,
        provincia: obra.provincia,
        numObras: 1,
        ine: null,
        poblacion: POBLACION,
      });
    return mapa;
  }, new Map<string, Municipio>()).values(),
);

/**
 * Todos los municipios: el piloto y los de la carga nacional (dato oficial
 * de PLACE, cuyas obras se descargan solo al elegir el municipio). Si un
 * municipio está en los dos, manda el piloto, que está verificado a mano.
 */
export const MUNICIPIOS: Municipio[] = [
  ...PILOTO,
  ...MUNICIPIOS_NACIONALES.filter((n) => !PILOTO.some((p) => p.nombre === n.nombre)).map((n) => ({ ...n })),
].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

export function buscarMunicipio(nombre: string | null): Municipio | null {
  return MUNICIPIOS.find((m) => m.nombre === nombre) ?? null;
}

export function existeMunicipio(nombre: string): boolean {
  return buscarMunicipio(nombre) !== null;
}

/** Obras del piloto (síncronas): las de la carga nacional van por `cargarObras`. */
export function obrasDe(municipio: string | null): Obra[] {
  return municipio ? OBRAS.filter((o) => o.municipio === municipio) : [];
}

/** Obras de un municipio: del código si es del piloto, de /datos si es nacional. */
export async function cargarObras(m: Municipio): Promise<Obra[]> {
  if (!m.ine) return obrasDe(m.nombre);
  const r = await fetch(`/datos/municipios/${m.ine}.json`);
  if (!r.ok) throw new Error(`No se pudieron cargar las obras de ${m.nombre} (HTTP ${r.status})`);
  const datos = (await r.json()) as { obras: Obra[] };
  return datos.obras;
}

/** «València» → «valencia»: para buscar sin acentos ni mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
